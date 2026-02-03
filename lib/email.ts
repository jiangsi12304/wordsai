import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface SendRedemptionEmailParams {
  to: string;
  code: string;
  orderId: string;
}

// 发送兑换码邮件
export async function sendRedemptionEmail({
  to,
  code,
  orderId,
}: SendRedemptionEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('Resend API key not configured, skipping email send');
    console.log('[MOCK EMAIL] To:', to, 'Code:', code);
    return { success: true }; // 开发环境下假装成功
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
      to,
      subject: '您的兑换码已发送',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">支付成功！</h2>
          <p>感谢您的购买，您的兑换码如下：</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <code style="font-size: 24px; letter-spacing: 2px; color: #333; font-weight: bold;">${code}</code>
          </div>
          <p><strong>订单号：</strong>${orderId}</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            请妥善保管您的兑换码，如有问题请联系客服。
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send exception:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
