import { getOrders } from '@/lib/local-storage';
import { NextResponse } from 'next/server';

// 获取订单列表（管理员用）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('adminKey');
    const status = searchParams.get('status');

    // 验证管理员权限
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: '无权操作' },
        { status: 403 }
      );
    }

    let orders = getOrders().sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (status) {
      orders = orders.filter((o: any) => o.status === status);
    }

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
