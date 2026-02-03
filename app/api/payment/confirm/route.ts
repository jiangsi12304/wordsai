import { generateRedemptionCode } from '@/lib/payment';
import { getOrder, updateOrder, createCode } from '@/lib/local-storage';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// 初始化 Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// 管理员确认支付（生成兑换码并发送邮件）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, adminKey } = body;

    // 验证管理员权限
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: '无权操作' },
        { status: 403 }
      );
    }

    if (!orderId) {
      return NextResponse.json(
        { error: '缺少订单ID' },
        { status: 400 }
      );
    }

    // 获取订单
    const order = getOrder(orderId);

    if (!order) {
      return NextResponse.json(
        { error: '订单不存在' },
        { status: 404 }
      );
    }

    if (order.status === 'paid') {
      return NextResponse.json(
        { error: '订单已完成' },
        { status: 400 }
      );
    }

    // 生成兑换码
    const code = generateRedemptionCode();

    // 更新订单状态
    const updatedOrder = updateOrder(orderId, {
      status: 'paid',
      paid_at: new Date().toISOString(),
      redemption_code: code,
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { error: '更新订单失败' },
        { status: 500 }
      );
    }

    // 创建兑换码记录
    createCode({
      code,
      orderId,
      email: order.email,
      planName: order.planName || order.notes,
      period: order.planPeriod || '月付',
      status: 'unused',
      created_at: new Date().toISOString(),
    });

    // 发送邮件
    let emailSent = false;
    let emailError = '';

    if (resend) {
      try {
        const { data, error } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: order.email,
          subject: '您的兑换码已发送',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
              <div style="background: white; border-radius: 12px; padding: 40px; text-align: center;">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <svg width="30" height="30" fill="white" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>

                <h2 style="color: #333; margin: 0 0 10px;">支付成功！</h2>
                <p style="color: #666; margin: 0 0 30px;">感谢您的购买，这是您的兑换码：</p>

                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <code style="font-size: 28px; letter-spacing: 4px; color: white; font-weight: bold; background: transparent;">
                    ${code}
                  </code>
                </div>

                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                  <p style="margin: 5px 0; color: #666;"><strong>套餐：</strong>${order.planName || order.notes}</p>
                  <p style="margin: 5px 0; color: #666;"><strong>金额：</strong>¥${order.amount}</p>
                  <p style="margin: 5px 0; color: #666;"><strong>订单号：</strong>${orderId.slice(0, 8)}...</p>
                </div>

                <p style="color: #999; font-size: 14px; margin: 30px 0 0;">
                  请妥善保管您的兑换码。如有问题请联系客服。
                </p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    此邮件由系统自动发送，请勿回复
                  </p>
                </div>
              </div>
            </div>
          `,
        });

        if (error) {
          emailError = error.message;
          console.error('Email send error:', error);
        } else {
          emailSent = true;
        }
      } catch (err) {
        emailError = '邮件发送失败';
        console.error('Email send exception:', err);
      }
    } else {
      console.log('[MOCK EMAIL] To:', order.email, 'Code:', code);
    }

    return NextResponse.json({
      success: true,
      code,
      email: order.email,
      emailSent,
      emailError,
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
