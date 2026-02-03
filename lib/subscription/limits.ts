import { createClient } from "@/lib/supabase/server";

export type PlanTier = "free" | "premium" | "flagship";

export interface SubscriptionLimits {
  maxWords: number;
  dailyChatLimit: number;
  canUseNotebook: boolean;
  canUseWhitelist: boolean;
  canUseVoiceVerify: boolean;
  canUseHandwriting: boolean;
  canUseStats: boolean;
  canExport: boolean;
  canUseConsultant: boolean;
}

export interface SubscriptionStatus {
  tier: PlanTier;
  isActive: boolean;
  endDate: string | null;
  limits: SubscriptionLimits;
  usage: {
    totalWords: number;
    todayChatCount: number;
  };
}

// 定义每个套餐的限制
const PLAN_LIMITS: Record<PlanTier, SubscriptionLimits> = {
  free: {
    maxWords: 50,
    dailyChatLimit: 10,
    canUseNotebook: false,
    canUseWhitelist: false,
    canUseVoiceVerify: false,
    canUseHandwriting: false,
    canUseStats: true,
    canExport: false,
    canUseConsultant: false,
  },
  premium: {
    maxWords: 500,
    dailyChatLimit: 100,
    canUseNotebook: true,
    canUseWhitelist: true,
    canUseVoiceVerify: true,
    canUseHandwriting: true,
    canUseStats: true,
    canExport: true,
    canUseConsultant: false,
  },
  flagship: {
    maxWords: -1, // 无限
    dailyChatLimit: -1, // 无限
    canUseNotebook: true,
    canUseWhitelist: true,
    canUseVoiceVerify: true,
    canUseHandwriting: true,
    canUseStats: true,
    canExport: true,
    canUseConsultant: true,
  },
};

/**
 * 获取用户订阅状态和限制
 */
export async function getUserSubscription(
  userId: string
): Promise<SubscriptionStatus> {
  const supabase = await createClient();

  // 获取用户当前订阅
  const { data: userSubscription, error: subError } = await supabase
    .from("user_subscriptions")
    .select(`
      *,
      subscription_plans (*)
    `)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 确定用户的套餐等级
  let tier: PlanTier = "free";
  let endDate: string | null = null;
  let isActive = true;

  if (userSubscription?.subscription_plans) {
    tier = userSubscription.subscription_plans.tier as PlanTier;
    endDate = userSubscription.end_date;
    isActive = userSubscription.status === "active";

    // 检查订阅是否过期
    if (endDate && new Date(endDate) < new Date()) {
      tier = "free";
      isActive = false;
      endDate = null;
    }
  }

  // 获取用户使用量
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

  return {
    tier,
    isActive,
    endDate,
    limits: PLAN_LIMITS[tier],
    usage: {
      totalWords: totalWords ?? 0,
      todayChatCount: todayChatCount ?? 0,
    },
  };
}

/**
 * 检查用户是否可以添加更多单词
 */
export async function canAddWords(
  userId: string,
  countToAdd: number = 1
): Promise<{ allowed: boolean; reason?: string; currentLimit: number }> {
  const subscription = await getUserSubscription(userId);
  const maxWords = subscription.limits.maxWords;

  if (maxWords === -1) {
    return { allowed: true, currentLimit: -1 };
  }

  if (subscription.usage.totalWords + countToAdd > maxWords) {
    return {
      allowed: false,
      reason: `已达到单词数量上限（${maxWords}个），请升级订阅`,
      currentLimit: maxWords,
    };
  }

  return { allowed: true, currentLimit: maxWords };
}

/**
 * 检查用户是否可以发送聊天消息
 */
export async function canSendChatMessage(
  userId: string
): Promise<{ allowed: boolean; reason?: string; remaining: number }> {
  const subscription = await getUserSubscription(userId);
  const dailyLimit = subscription.limits.dailyChatLimit;

  if (dailyLimit === -1) {
    return { allowed: true, remaining: -1 };
  }

  const remaining = dailyLimit - subscription.usage.todayChatCount;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `今日对话次数已达上限（${dailyLimit}条），请明天再试或升级订阅`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining };
}

/**
 * 检查用户是否有权限使用特定功能
 */
export async function checkFeatureAccess(
  userId: string,
  feature: keyof SubscriptionLimits
): Promise<{ allowed: boolean; reason?: string; tier: PlanTier }> {
  const subscription = await getUserSubscription(userId);
  const hasAccess = subscription.limits[feature];

  if (!hasAccess) {
    const featureNames: Record<string, string> = {
      canUseNotebook: "艾宾浩斯单词本",
      canUseWhitelist: "白名单训练",
      canUseVoiceVerify: "声纹验证",
      canUseHandwriting: "手写练习",
      canUseStats: "学习统计",
      canExport: "数据导出",
      canUseConsultant: "人工顾问",
      maxWords: "添加更多单词",
      dailyChatLimit: "更多对话次数",
    };

    return {
      allowed: false,
      reason: `${featureNames[feature]}功能需要高级版或更高订阅`,
      tier: subscription.tier,
    };
  }

  return { allowed: true, tier: subscription.tier };
}

/**
 * 格式化订阅状态用于API响应
 */
export function formatSubscriptionResponse(
  subscription: SubscriptionStatus
): {
  tier: PlanTier;
  limits: SubscriptionLimits;
  usage: typeof subscription.usage;
  canUpgrade: boolean;
} {
  return {
    tier: subscription.tier,
    limits: subscription.limits,
    usage: subscription.usage,
    canUpgrade: subscription.tier !== "flagship",
  };
}
