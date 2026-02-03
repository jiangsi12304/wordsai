import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  getUserSubscription,
  checkFeatureAccess,
} from "@/lib/subscription/limits";

// GET /api/subscription/check - 检查用户订阅状态和功能访问权限
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { searchParams } = new URL(request.url);
  const feature = searchParams.get("feature");

  const subscription = await getUserSubscription(userId);

  if (feature) {
    // 检查特定功能权限
    const access = await checkFeatureAccess(userId, feature as any);
    return NextResponse.json({
      feature,
      ...access,
    });
  }

  // 返回完整订阅状态
  return NextResponse.json({
    tier: subscription.tier,
    isActive: subscription.isActive,
    endDate: subscription.endDate,
    limits: subscription.limits,
    usage: subscription.usage,
    canAddMoreWords: subscription.limits.maxWords === -1 ||
      subscription.usage.totalWords < subscription.limits.maxWords,
    canSendMoreMessages: subscription.limits.dailyChatLimit === -1 ||
      subscription.usage.todayChatCount < subscription.limits.dailyChatLimit,
  });
}
