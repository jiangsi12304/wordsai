import { findCode, updateCode } from '@/lib/local-storage';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// 套餐名称到tier的映射
const PLAN_NAME_TO_TIER: Record<string, string> = {
  '高级版': 'premium',
  '旗舰版': 'flagship',
  '终身版': 'flagship_lifetime',
  '免费版': 'free',
};

// 计算订阅结束时间
function calculateEndDate(period: string): Date | null {
  const endDate = new Date();

  if (period === '年付') {
    endDate.setFullYear(endDate.getFullYear() + 1);
    return endDate;
  } else if (period === '月付') {
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  } else if (period === '终身') {
    // 终身版：100年后过期
    endDate.setFullYear(endDate.getFullYear() + 100);
    return endDate;
  }

  return null; // 其他情况视为永久
}

// 验证兑换码
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: '请输入兑换码' },
        { status: 400 }
      );
    }

    // 获取当前用户
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getClaims();

    if (authError || !authData?.claims) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const userId = authData.claims.sub;

    // 清理兑换码（去除连字符和空格）
    const cleanCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    // 如果输入的兑换码是 12 位不带连字符，尝试查找带连字符的格式
    const codeToSearch = cleanCode.length === 12 && !code.includes('-')
      ? `${cleanCode.slice(0, 4)}-${cleanCode.slice(4, 8)}-${cleanCode.slice(8, 12)}`
      : code.toUpperCase();

    // 查找兑换码
    const redemptionCode = findCode(codeToSearch);

    if (!redemptionCode) {
      return NextResponse.json(
        { error: '兑换码无效' },
        { status: 404 }
      );
    }

    // 检查状态
    if (redemptionCode.status === 'used') {
      return NextResponse.json(
        { error: '此兑换码已被使用' },
        { status: 400 }
      );
    }

    if (redemptionCode.status === 'expired') {
      return NextResponse.json(
        { error: '此兑换码已过期' },
        { status: 400 }
      );
    }

    // 检查是否过期
    if (redemptionCode.expires_at && new Date(redemptionCode.expires_at) < new Date()) {
      updateCode(codeToSearch, { status: 'expired' });
      return NextResponse.json(
        { error: '此兑换码已过期' },
        { status: 400 }
      );
    }

    // 获取套餐信息
    const planName = redemptionCode.planName || '高级版';
    const tier = PLAN_NAME_TO_TIER[planName] || 'premium';

    // 在Supabase中查找对应的套餐
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('tier', tier)
      .eq('is_active', true)
      .maybeSingle();

    if (planError || !plan) {
      console.error('Plan lookup error:', planError);
      return NextResponse.json(
        { error: '套餐配置错误，请联系客服' },
        { status: 500 }
      );
    }

    // 计算结束时间
    const endDate = calculateEndDate(redemptionCode.period || '月付');

    // 取消所有现有的active订阅
    await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled', cancel_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active');

    // 创建新的订阅记录
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: endDate ? endDate.toISOString() : null,
        auto_renew: false,
        payment_method: 'redemption_code',
        currency: 'CNY',
        amount: 0,
      });

    if (subError) {
      console.error('Subscription creation error:', subError);
      return NextResponse.json(
        { error: '创建订阅失败，请重试' },
        { status: 500 }
      );
    }

    // 添加到订阅历史
    await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: endDate ? endDate.toISOString() : null,
        amount: 0,
        currency: 'CNY',
        payment_method: 'redemption_code',
      });

    // 标记兑换码为已使用
    const updated = updateCode(codeToSearch, {
      status: 'used',
      used_at: new Date().toISOString(),
      used_by: userId,
    });

    if (!updated) {
      console.error('Failed to mark code as used, but subscription was created');
    }

    return NextResponse.json({
      success: true,
      message: '兑换成功！会员已激活',
      tier: tier,
      planName: plan.name,
      endDate: endDate ? endDate.toISOString() : null,
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
