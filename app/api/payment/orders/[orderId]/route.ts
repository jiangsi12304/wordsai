import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/payment/orders/[orderId] - 获取单个订单详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { orderId } = await params;

  const { data: order } = await supabase
    .from("payment_orders")
    .select(`
      *,
      subscription_plans (*)
    `)
    .eq("id", orderId)
    .eq("user_id", userId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // 获取发票信息
  const { data: invoice } = await supabase
    .from("payment_invoices")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  return NextResponse.json({
    order,
    invoice,
  });
}

// DELETE /api/payment/orders/[orderId] - 取消订单
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { orderId } = await params;

  // 获取订单
  const { data: order } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // 只能取消待支付的订单
  if (order.payment_status !== "pending") {
    return NextResponse.json({ error: "只能取消待支付的订单" }, { status: 400 });
  }

  // 更新订单状态
  const { error: updateError } = await supabase
    .from("payment_orders")
    .update({ payment_status: "cancelled" })
    .eq("id", orderId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "订单已取消" });
}
