import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/payment/orders/[orderId]/invoice - 申请开票
export async function POST(
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
  const body = await request.json();
  const { invoiceType = "personal", invoiceTitle } = body;

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

  if (order.payment_status !== "success") {
    return NextResponse.json({ error: "只能为已支付的订单开具发票" }, { status: 400 });
  }

  // 检查是否已有发票
  const { data: existingInvoice } = await supabase
    .from("payment_invoices")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingInvoice) {
    return NextResponse.json({
      invoice: existingInvoice,
      message: "发票已存在",
    });
  }

  // 生成发票号
  const { data: invoiceNo } = await supabase.rpc("generate_invoice_no");

  // 创建发票记录
  const { data: invoice, error: invoiceError } = await supabase
    .from("payment_invoices")
    .insert({
      user_id: userId,
      order_id: orderId,
      invoice_no: invoiceNo,
      invoice_type: invoiceType,
      invoice_title: invoiceTitle || (invoiceType === "personal" ? "个人" : ""),
      amount: order.amount,
      total_amount: order.amount,
      status: "issued",
      issued_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }

  return NextResponse.json({
    invoice,
    message: "发票开具成功",
  });
}
