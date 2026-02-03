import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/subscription - 获取用户当前订阅状态和可用套餐
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;

  // 获取用户当前订阅
  const { data: userSubscription, error: subError } = await supabase
    .from("user_subscriptions")
    .select(`
      *,
      plan_id,
      subscription_plans (*)
    `)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) {
    console.error("Error fetching subscription:", subError);
  }

  // 获取所有可用套餐
  const { data: plans, error: plansError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (plansError) {
    return NextResponse.json({ error: plansError.message }, { status: 500 });
  }

  // 如果用户没有订阅，返回免费版
  const freePlan = plans?.find((p) => p.tier === "free");
  const currentPlan = userSubscription?.subscription_plans || freePlan;

  // 计算用户当前使用量
  const { count: totalWords = 0 } = await supabase
    .from("word_friends")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  // 获取今日聊天消息数
  const today = new Date().toISOString().split("T")[0];
  const { count: todayChatCount = 0 } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", today);

  // 获取订阅历史
  const { data: subscriptionHistory } = await supabase
    .from("subscription_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    currentSubscription: userSubscription || {
      id: null,
      user_id: userId,
      plan_id: freePlan?.id || null,
      status: "active",
      start_date: new Date().toISOString(),
      end_date: null,
      auto_renew: false,
    },
    currentPlan: {
      id: currentPlan?.id,
      name: currentPlan?.name,
      tier: currentPlan?.tier,
      price_monthly: currentPlan?.price_monthly,
      price_yearly: currentPlan?.price_yearly,
      description: currentPlan?.description,
      features: currentPlan?.features,
    },
    availablePlans: plans?.map((plan) => ({
      id: plan.id,
      name: plan.name,
      tier: plan.tier,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      description: plan.description,
      features: plan.features,
      display_order: plan.display_order,
    })) || [],
    usage: {
      totalWords,
      todayChatCount,
    },
    subscriptionHistory: subscriptionHistory || [],
  });
}

// POST /api/subscription - 创建或更新订阅
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { planId, billingCycle = "monthly", paymentMethod = "manual" } = body;

  // 获取目标套餐
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // 如果是免费版，直接激活
  if (plan.tier === "free") {
    // 取消所有现有付费订阅
    await supabase
      .from("user_subscriptions")
      .update({ status: "cancelled", cancel_at: new Date().toISOString() })
      .eq("user_id", userId)
      .neq("status", "cancelled");

    return NextResponse.json({
      success: true,
      message: "已切换到免费版",
      subscription: {
        user_id: userId,
        plan_id: plan.id,
        status: "active",
        tier: "free",
      },
    });
  }

  // 付费订阅需要处理支付（这里返回支付信息）
  const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;

  // 计算订阅结束时间
  const startDate = new Date();
  const endDate = new Date(startDate);
  if (billingCycle === "yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  // TODO: 接入支付系统（微信支付、支付宝、Stripe）
  // 目前返回模拟支付信息
  return NextResponse.json({
    success: false,
    requiresPayment: true,
    paymentInfo: {
      amount: price,
      currency: "CNY",
      cycle: billingCycle,
      planName: plan.name,
      // 实际接入时需要返回支付链接或二维码
      message: "支付功能开发中，请联系客服开通",
    },
    previewSubscription: {
      user_id: userId,
      plan_id: plan.id,
      status: "pending_payment",
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      billing_cycle: billingCycle,
      amount: price,
    },
  });
}

// PATCH /api/subscription - 更新订阅（如续费、升级等）
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { action, subscriptionId } = body;

  const { data: existingSub } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .single();

  if (!existingSub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  switch (action) {
    case "cancel": {
      const cancelDate = new Date();
      const endDate = existingSub.end_date
        ? new Date(existingSub.end_date)
        : cancelDate;

      // 取消订阅，但保留到当前周期结束
      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          status: "cancelled",
          cancel_at: cancelDate.toISOString(),
          auto_renew: false,
        })
        .eq("id", subscriptionId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // 记录到历史
      await supabase.from("subscription_history").insert({
        user_id: userId,
        plan_id: existingSub.plan_id,
        status: "cancelled",
        start_date: existingSub.start_date,
        end_date: existingSub.end_date,
        amount: existingSub.amount,
        currency: existingSub.currency || "CNY",
        payment_method: existingSub.payment_method,
      });

      return NextResponse.json({
        success: true,
        message: "订阅已取消",
        validUntil: endDate,
      });
    }

    case "renew": {
      // 续费订阅
      const newEndDate = new Date(existingSub.end_date || new Date());
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      const { error: renewError } = await supabase
        .from("user_subscriptions")
        .update({
          status: "active",
          end_date: newEndDate.toISOString(),
          cancel_at: null,
          auto_renew: true,
        })
        .eq("id", subscriptionId);

      if (renewError) {
        return NextResponse.json({ error: renewError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "订阅已续费",
        newEndDate: newEndDate.toISOString(),
      });
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}

// DELETE /api/subscription - 取消订阅
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get("id");

  if (!subscriptionId) {
    return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });
  }

  const { data: existingSub } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .single();

  if (!existingSub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  // 取消订阅
  const { error: cancelError } = await supabase
    .from("user_subscriptions")
    .update({
      status: "cancelled",
      cancel_at: new Date().toISOString(),
      auto_renew: false,
    })
    .eq("id", subscriptionId);

  if (cancelError) {
    return NextResponse.json({ error: cancelError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "订阅已取消",
    validUntil: existingSub.end_date,
  });
}
