import { isValidEmail, generateRedemptionCode } from '@/lib/payment';
import { createOrder } from '@/lib/local-storage';
import { NextResponse } from 'next/server';

// 套餐配置（与前端保持一致）
const PLANS = {
  'premium-month': { name: '高级版', period: '月付', price: 3 },
  'premium-year': { name: '高级版', period: '年付', price: 5 },
  'flagship-month': { name: '旗舰版', period: '月付', price: 10 },
  'flagship-year': { name: '旗舰版', period: '年付', price: 15 },
  'flagship-lifetime': { name: '旗舰版', period: '终身', price: 20 },
};

// 创建支付订单
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, planId, amount } = body;

    // 验证邮箱
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      );
    }

    // 验证套餐
    if (!planId || !PLANS[planId as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: '请选择有效的套餐' },
        { status: 400 }
      );
    }

    const plan = PLANS[planId as keyof typeof PLANS];

    // 验证金额
    if (!amount || amount < plan.price) {
      return NextResponse.json(
        { error: '支付金额不正确' },
        { status: 400 }
      );
    }

    // 创建订单（使用本地存储）
    const order = createOrder({
      email,
      planId,
      planName: plan.name,
      planPeriod: plan.period,
      amount: plan.price,
      payment_method: 'wechat',
      notes: `${plan.name} - ${plan.period}`,
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      planName: plan.name,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
