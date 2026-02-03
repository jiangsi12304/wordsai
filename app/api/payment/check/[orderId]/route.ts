import { getOrder } from '@/lib/local-storage';
import { NextResponse } from 'next/server';

// 检查订单支付状态
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: '无效的订单ID' },
        { status: 400 }
      );
    }

    const order = getOrder(orderId);

    if (!order) {
      return NextResponse.json(
        { error: '订单不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status: order.status,
      paidAt: order.paid_at,
    });
  } catch (error) {
    console.error('Check order error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
