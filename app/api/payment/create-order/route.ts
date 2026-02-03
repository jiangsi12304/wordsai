import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

// POST /api/payment/create-order - 创建支付订单
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { planId, billingCycle = "monthly", paymentMethod = "wechat" } = body;

  if (!planId) {
    return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
  }

  // 获取套餐信息
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // 计算金额
  const amount = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;

  // 检查用户是否有待支付订单（未过期）
  const { data: existingOrder } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .eq("billing_cycle", billingCycle)
    .eq("payment_status", "pending")
    .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString()) // 15分钟内
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOrder) {
    // 返回现有订单
    return NextResponse.json({
      orderId: existingOrder.id,
      orderNo: existingOrder.order_no,
      amount: existingOrder.amount,
      qrCodeUrl: existingOrder.qr_code_url,
      expiredAt: existingOrder.expired_at,
      isExisting: true,
    });
  }

  // 生成订单号
  const { data: orderData } = await supabase.rpc("generate_order_no");

  // 订单过期时间（15分钟后）
  const expiredAt = new Date(Date.now() + 15 * 60 * 1000);

  // 创建支付订单
  const { data: order, error: orderError } = await supabase
    .from("payment_orders")
    .insert({
      user_id: userId,
      order_no: orderData,
      plan_id: planId,
      product_name: plan.name,
      product_type: "subscription",
      billing_cycle: billingCycle,
      amount: amount,
      currency: "CNY",
      payment_method: paymentMethod,
      payment_status: "pending",
      expired_at: expiredAt.toISOString(),
    })
    .select()
    .single();

  if (orderError) {
    console.error("Failed to create order:", orderError);
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  // 根据支付方式生成支付信息
  let paymentInfo: any = {
    orderId: order.id,
    orderNo: order.order_no,
    amount: amount,
    productName: plan.name,
    billingCycle: billingCycle,
  };

  if (paymentMethod === "wechat") {
    // 微信支付 - 模拟返回二维码URL
    // 实际接入需要调用微信统一下单API
    const qrCodeUrl = `https://qr.alipay.com/demo?order_no=${order.order_no}&amount=${amount}`;
    paymentInfo.qrCodeUrl = qrCodeUrl;
    paymentInfo.qrCodeContent = `wp_wechat_pay_${order.order_no}`;

    // 更新订单的二维码URL
    await supabase
      .from("payment_orders")
      .update({ qr_code_url: qrCodeUrl })
      .eq("id", order.id);
  } else if (paymentMethod === "alipay") {
    // 支付宝支付 - 模拟返回二维码URL
    // 实际接入需要调用支付宝统一下单API
    const qrCodeUrl = `https://qr.alipay.com/demo?order_no=${order.order_no}&amount=${amount}`;
    paymentInfo.qrCodeUrl = qrCodeUrl;
    paymentInfo.qrCodeContent = `wp_alipay_${order.order_no}`;

    await supabase
      .from("payment_orders")
      .update({ qr_code_url: qrCodeUrl })
      .eq("id", order.id);
  } else if (paymentMethod === "manual") {
    // 手动转账（用于测试）
    paymentInfo.manualTransfer = true;
    paymentInfo.bankAccount = {
      bank: "招商银行",
      account: "6225 **** **** 1234",
      accountName: "XX科技有限公司",
    };
  }

  return NextResponse.json(paymentInfo);
}

// GET /api/payment/create-order - 查询订单状态
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  // 查询订单
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

  return NextResponse.json({
    id: order.id,
    orderNo: order.order_no,
    amount: order.amount,
    paymentStatus: order.payment_status,
    paidAt: order.paid_at,
    plan: order.subscription_plans,
  });
}
