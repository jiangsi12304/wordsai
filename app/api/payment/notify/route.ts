import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

// POST /api/payment/notify - 支付回调通知（微信/支付宝）
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { type = "wechat" } = body;

  console.log("Payment notification received:", type, body);

  // 根据支付类型处理
  if (type === "wechat") {
    return await handleWechatNotify(supabase, body);
  } else if (type === "alipay") {
    return await handleAlipayNotify(supabase, body);
  }

  return NextResponse.json({ error: "Unsupported payment type" }, { status: 400 });
}

// 处理微信支付回调
async function handleWechatNotify(supabase: Awaited<ReturnType<typeof createClient>>, body: any) {
  const { out_trade_no, transaction_id, total_fee, result_code, trade_state } = body;

  if (!out_trade_no) {
    return new NextResponse("FAIL", { status: 400 });
  }

  // 查找订单
  const { data: order } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("order_no", out_trade_no)
    .single();

  if (!order) {
    console.error("Order not found:", out_trade_no);
    return new NextResponse("FAIL", { status: 404 });
  }

  // 验证金额
  const orderAmount = order.amount;
  if (total_fee && parseInt(total_fee) !== orderAmount) {
    console.error("Amount mismatch:", total_fee, orderAmount);
    return new NextResponse("FAIL", { status: 400 });
  }

  // 检查支付状态
  if ((result_code === "SUCCESS" || trade_state === "SUCCESS") && order.payment_status === "pending") {
    // 支付成功，更新订单
    const now = new Date().toISOString();

    // 更新订单状态
    await supabase
      .from("payment_orders")
      .update({
        payment_status: "success",
        transaction_id: transaction_id,
        paid_at: now,
      })
      .eq("id", order.id);

    // 激活用户订阅
    await activateSubscription(supabase, order);
  }

  return new NextResponse("SUCCESS", { status: 200 });
}

// 处理支付宝回调
async function handleAlipayNotify(supabase: Awaited<ReturnType<typeof createClient>>, body: any) {
  const { out_trade_no, trade_no, total_amount, trade_status } = body;

  if (!out_trade_no) {
    return new NextResponse("FAIL", { status: 400 });
  }

  // 查找订单
  const { data: order } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("order_no", out_trade_no)
    .single();

  if (!order) {
    console.error("Order not found:", out_trade_no);
    return new NextResponse("FAIL", { status: 404 });
  }

  // 验证金额（支付宝金额单位是元，需要转换为分）
  const orderAmount = order.amount / 100;
  if (total_amount && parseFloat(total_amount) !== orderAmount) {
    console.error("Amount mismatch:", total_amount, orderAmount);
    return new NextResponse("FAIL", { status: 400 });
  }

  // 检查支付状态
  if (trade_status === "TRADE_SUCCESS" || trade_status === "TRADE_FINISHED") {
    if (order.payment_status === "pending") {
      // 支付成功，更新订单
      const now = new Date().toISOString();

      await supabase
        .from("payment_orders")
        .update({
          payment_status: "success",
          transaction_id: trade_no,
          paid_at: now,
        })
        .eq("id", order.id);

      // 激活用户订阅
      await activateSubscription(supabase, order);
    }
  }

  return new NextResponse("SUCCESS", { status: 200 });
}

// 激活用户订阅
async function activateSubscription(
  supabase: Awaited<ReturnType<typeof createClient>>,
  order: any
) {
  // 计算订阅结束时间
  const startDate = new Date();
  const endDate = new Date(startDate);

  if (order.billing_cycle === "yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  // 查找是否有活跃订阅
  const { data: existingSub } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", order.user_id)
    .eq("status", "active")
    .maybeSingle();

  if (existingSub) {
    // 更新现有订阅
    await supabase
      .from("user_subscriptions")
      .update({
        plan_id: order.plan_id,
        end_date: endDate.toISOString(),
        amount: order.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingSub.id);
  } else {
    // 创建新订阅
    await supabase
      .from("user_subscriptions")
      .insert({
        user_id: order.user_id,
        plan_id: order.plan_id,
        status: "active",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        amount: order.amount,
        auto_renew: false,
      });

    // 记录到历史
    await supabase.from("subscription_history").insert({
      user_id: order.user_id,
      plan_id: order.plan_id,
      status: "active",
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      amount: order.amount,
      payment_method: order.payment_method,
    });
  }
}

// 测试模式：模拟支付成功
export async function PUT(request: Request) {
  const body = await request.json();
  const { orderId } = body;

  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;

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

  // 模拟支付成功
  const now = new Date().toISOString();

  await supabase
    .from("payment_orders")
    .update({
      payment_status: "success",
      transaction_id: `TEST_${Date.now()}`,
      paid_at: now,
    })
    .eq("id", orderId);

  // 激活订阅
  await activateSubscription(supabase, order);

  return NextResponse.json({
    success: true,
    orderId,
    paymentStatus: "success",
  });
}
