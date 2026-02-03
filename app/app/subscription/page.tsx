"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Check,
  Crown,
  Sparkles,
  Gem,
  Loader2,
  Zap,
  Calendar,
  TrendingUp,
  X,
  QrCode,
  Smartphone,
  Copy,
  Check as CheckIcon2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import RedeemModal from "@/components/redeem-modal";

type PlanType = "free" | "premium" | "flagship" | "flagship_lifetime";

interface Plan {
  id: string;
  name: string;
  tier: PlanType;
  price_monthly: number;
  price_yearly: number;
  price_lifetime?: number;
  description: string;
  features: Record<string, string>;
  display_order: number;
}

interface UsageData {
  totalWords: number;
  todayChatCount: number;
}

interface SubscriptionData {
  currentSubscription: {
    id: string | null;
    status: string;
    start_date: string;
    end_date: string | null;
    auto_renew: boolean;
  };
  currentPlan: {
    id: string;
    name: string;
    tier: PlanType;
    price_monthly: number;
    price_yearly: number;
    description: string;
    features: Record<string, string>;
  };
  availablePlans: Plan[];
  usage: UsageData;
  subscriptionHistory: Array<{
    id: string;
    status: string;
    start_date: string;
    end_date: string | null;
    amount: number | null;
    created_at: string;
  }>;
}

interface PaymentOrderData {
  orderId: string;
  orderNo: string;
  amount: number;
  qrCodeUrl: string;
  expiredAt: string;
  planName: string;
  billingCycle: string;
}

// 定义套餐的功能限制
const PLAN_LIMITS: Record<
  PlanType,
  { maxWords: number; dailyChat: number; features: string[] }
> = {
  free: {
    maxWords: 50,
    dailyChat: 10,
    features: ["基础复习模式", "单词详情展示", "学习进度追踪"],
  },
  premium: {
    maxWords: 500,
    dailyChat: 100,
    features: [
      "无限添加单词",
      "AI 对话练习",
      "艾宾浩斯单词本",
      "白名单强化训练",
      "声纹验证（无限次）",
      "全屏手写练习",
      "详细学习数据统计",
      "三种复习模式",
      "数据导出 (CSV)",
    ],
  },
  flagship: {
    maxWords: -1, // 无限
    dailyChat: -1, // 无限
    features: [
      "高级版全部功能",
      "GPT-4 级别 AI 对话",
      "高精度语音识别+纠错",
      "每月 1 次人工顾问咨询",
      "专业学习分析报告",
      "优先客服支持",
      "数据导出 (PDF)",
      "自定义学习计划",
    ],
  },
  flagship_lifetime: {
    maxWords: -1,
    dailyChat: -1,
    features: [
      "旗舰版全部功能",
      "终身使用",
      "一次购买永久有效",
      "无需续费",
    ],
  },
};

const FEATURE_LABELS = [
  { key: "words", label: "单词数量" },
  { key: "chat", label: "AI 对话" },
  { key: "notebook", label: "艾宾浩斯单词本" },
  { key: "review", label: "复习模式" },
  { key: "whitelist", label: "白名单训练" },
  { key: "voice", label: "声纹验证" },
  { key: "handwriting", label: "手写练习" },
  { key: "stats", label: "学习统计" },
  { key: "export", label: "数据导出" },
  { key: "consultant", label: "人工顾问" },
  { key: "priority", label: "优先支持" },
];

const PLAN_ICONS: Record<PlanType, React.ReactNode> = {
  free: <Sparkles className="w-6 h-6" />,
  premium: <Crown className="w-6 h-6" />,
  flagship: <Gem className="w-6 h-6" />,
  flagship_lifetime: <Gem className="w-6 h-6" />,
};

const PLAN_COLORS: Record<PlanType, string> = {
  free: "from-gray-500 to-gray-600",
  premium: "from-blue-500 to-blue-600",
  flagship: "from-purple-500 to-pink-500",
  flagship_lifetime: "from-amber-500 to-orange-500",
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrderData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay">("wechat");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed">("pending");
  const [polling, setPolling] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const res = await fetch("/api/subscription");
      if (!res.ok) {
        throw new Error("Failed to fetch subscription data");
      }
      const data = await res.json();
      setSubscriptionData(data);
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
      setMessage({ type: "error", text: "获取订阅信息失败" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, planTier: PlanType) => {
    const currentTier = subscriptionData?.currentPlan?.tier;

    // 如果已经是当前套餐
    if (planTier === currentTier) {
      router.push("/app/profile");
      return;
    }

    // 如果是降级到免费版
    if (planTier === "free") {
      if (!confirm("确定要切换到免费版吗？免费版功能有限。")) {
        return;
      }
      setSubscribing(true);
      setMessage(null);
      try {
        const res = await fetch("/api/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, billingCycle }),
        });
        const data = await res.json();
        if (data.success) {
          setMessage({ type: "success", text: data.message || "已切换到免费版" });
          await fetchSubscriptionData();
        } else {
          setMessage({ type: "error", text: data.error || "操作失败" });
        }
      } catch (error) {
        console.error("Subscription error:", error);
        setMessage({ type: "error", text: "网络错误，请重试" });
      } finally {
        setSubscribing(false);
      }
      return;
    }

    // 付费套餐：创建支付订单
    setSubscribing(true);
    setMessage(null);
    setPaymentStatus("pending");

    try {
      // 先创建支付订单
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
          paymentMethod,
        }),
      });

      const orderData = await orderRes.json();

      if (orderData.orderId) {
        const plan = subscriptionData?.availablePlans?.find((p) => p.id === planId);
        setPaymentOrder({
          orderId: orderData.orderId,
          orderNo: orderData.orderNo,
          amount: billingCycle === "yearly"
            ? (plan?.price_yearly || 0)
            : (plan?.price_monthly || 0),
          qrCodeUrl: orderData.qrCodeUrl,
          expiredAt: orderData.expiredAt,
          planName: plan?.name || "",
          billingCycle: billingCycle === "yearly" ? "年付" : "月付",
        });
        setShowPaymentModal(true);
        // 开始轮询支付状态
        startPaymentPolling(orderData.orderId);
      } else {
        setMessage({ type: "error", text: orderData.error || "创建订单失败" });
      }
    } catch (error) {
      console.error("Create order error:", error);
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setSubscribing(false);
    }
  };

  // 轮询支付状态
  const startPaymentPolling = (orderId: string) => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.order?.payment_status === "success") {
            setPaymentStatus("success");
            setPolling(false);
            clearInterval(interval);
            // 刷新订阅数据
            await fetchSubscriptionData();
            // 3秒后关闭弹窗
            setTimeout(() => {
              setShowPaymentModal(false);
              setPaymentOrder(null);
            }, 3000);
          } else if (data.order?.payment_status === "failed") {
            setPaymentStatus("failed");
            setPolling(false);
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);

    // 15分钟后停止轮询
    setTimeout(() => {
      clearInterval(interval);
      setPolling(false);
    }, 15 * 60 * 1000);
  };

  // 关闭支付弹窗
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentOrder(null);
    setPaymentStatus("pending");
  };

  // 切换支付方式
  const switchPaymentMethod = async (method: "wechat" | "alipay") => {
    if (!paymentOrder) return;
    setPaymentMethod(method);
    setPaymentStatus("pending");

    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: subscriptionData?.availablePlans?.find(
            (p) => p.name === paymentOrder.planName
          )?.id,
          billingCycle: paymentOrder.billingCycle === "年付" ? "yearly" : "monthly",
          paymentMethod: method,
        }),
      });

      const orderData = await res.json();
      if (orderData.orderId) {
        setPaymentOrder({
          ...paymentOrder,
          orderId: orderData.orderId,
          orderNo: orderData.orderNo,
          qrCodeUrl: orderData.qrCodeUrl,
          expiredAt: orderData.expiredAt,
        });
        startPaymentPolling(orderData.orderId);
      }
    } catch (error) {
      console.error("Switch payment method error:", error);
    }
  };

  // 测试支付（仅用于开发环境）
  const simulatePayment = async () => {
    if (!paymentOrder) return;
    try {
      const res = await fetch("/api/payment/notify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: paymentOrder.orderId }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentStatus("success");
        setPolling(false);
        await fetchSubscriptionData();
        setTimeout(() => {
          setShowPaymentModal(false);
          setPaymentOrder(null);
        }, 2000);
      }
    } catch (error) {
      console.error("Simulate payment error:", error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionData?.currentSubscription?.id) {
      return;
    }

    if (!confirm("确定要取消订阅吗？取消后将在当前计费周期结束后生效。")) {
      return;
    }

    setSubscribing(true);
    try {
      const res = await fetch(
        `/api/subscription?id=${subscriptionData.currentSubscription.id}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "订阅已取消" });
        await fetchSubscriptionData();
      } else {
        setMessage({ type: "error", text: data.error || "取消失败" });
      }
    } catch (error) {
      console.error("Cancel error:", error);
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setSubscribing(false);
    }
  };

  const getDisplayPrice = (plan: Plan) => {
    // 终身版特殊处理
    if (plan.tier === "flagship_lifetime" || plan.id === "lifetime") {
      const lifetimePrice = plan.price_lifetime ? plan.price_lifetime : 20;
      return (
        <div className="text-center">
          <span className="text-4xl font-bold">¥{lifetimePrice}</span>
          <span className="text-foreground/60">/终身</span>
          <p className="text-sm text-green-500 mt-1">
            一次购买永久使用
          </p>
        </div>
      );
    }

    // 年付处理
    if (billingCycle === "yearly" && plan.price_yearly > 0) {
      const yearlyPrice = plan.price_yearly;
      const monthlyPrice = plan.price_monthly;

      return (
        <div className="text-center">
          <span className="text-4xl font-bold">¥{yearlyPrice}</span>
          <span className="text-foreground/60">/年</span>
          {monthlyPrice > 0 && (
            <p className="text-sm text-green-500 mt-1">
              折合约 ¥{Math.round(yearlyPrice / 12)}/月
            </p>
          )}
        </div>
      );
    }

    // 月付处理
    const monthlyPrice = plan.price_monthly;
    return (
      <div className="text-center">
        <span className="text-4xl font-bold">¥{monthlyPrice}</span>
        <span className="text-foreground/60">/月</span>
      </div>
    );
  };

  const currentTier = subscriptionData?.currentPlan?.tier || "free";
  const currentPlan = subscriptionData?.availablePlans?.find(
    (p) => p.tier === currentTier
  );

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/app/profile")}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">会员订阅</h1>
            <div className="w-9" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/app/profile")}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">会员订阅</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Message Banner */}
      {message && (
        <div
          className={cn(
            "mx-4 mt-4 px-4 py-3 rounded-lg text-sm",
            message.type === "success"
              ? "bg-green-500/10 text-green-600 dark:text-green-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto pb-4">
        <div className="p-4 space-y-6">
          {/* Current Status */}
          <div className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-foreground/60">当前套餐</p>
                <p className="text-lg font-semibold">
                  {subscriptionData?.currentPlan?.name}
                </p>
                {subscriptionData?.currentSubscription?.end_date && (
                  <p className="text-xs text-foreground/60 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    有效期至:{" "}
                    {new Date(
                      subscriptionData.currentSubscription.end_date
                    ).toLocaleDateString("zh-CN")}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                {PLAN_ICONS[currentTier]}
              </div>
            </div>

            {/* Usage Progress */}
            {currentTier === "free" && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-foreground/60">单词使用量</span>
                  <span>
                    {subscriptionData?.usage?.totalWords || 0} / 50
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        ((subscriptionData?.usage?.totalWords || 0) / 50) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm mt-2 mb-2">
                  <span className="text-foreground/60">今日对话</span>
                  <span>
                    {subscriptionData?.usage?.todayChatCount || 0} / 10
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        ((subscriptionData?.usage?.todayChatCount || 0) / 10) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* 兑换码升级按钮 */}
            <button
              onClick={() => setShowRedeemModal(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-pink-700 transition-colors"
            >
              <Crown className="w-4 h-4 mr-2 inline" />
              使用兑换码
            </button>

            {/* 取消订阅按钮 */}
            {currentTier !== "free" &&
              subscriptionData?.currentSubscription?.status === "active" && (
              <button
                onClick={handleCancelSubscription}
                disabled={subscribing}
                className="w-full px-4 py-3 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                {subscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                    处理中...
                  </>
                ) : (
                  "取消订阅"
                )}
              </button>
              )}
          </div>

          {/* Redeem Modal */}
          {showRedeemModal && (
            <RedeemModal onClose={() => setShowRedeemModal(false)} />
          )}

          {/* Billing Toggle */}
          <div className="flex justify-center">
            <div className="bg-muted rounded-lg p-1 inline-flex">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "px-6 py-2 rounded-md text-sm font-medium transition-colors",
                  billingCycle === "monthly"
                    ? "bg-background shadow"
                    : "text-foreground/60"
                )}
              >
                按月付费
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={cn(
                  "px-6 py-2 rounded-md text-sm font-medium transition-colors relative",
                  billingCycle === "yearly"
                    ? "bg-background shadow"
                    : "text-foreground/60"
                )}
              >
                按年付费
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
                  省17%
                </span>
              </button>
            </div>
          </div>

          {/* Plan Cards */}
          <div className="space-y-4">
            {subscriptionData?.availablePlans?.map((plan) => {
              const isCurrent = plan.tier === currentTier;
              const badge = plan.tier === "premium" ? "推荐" : plan.tier === "flagship" ? "超值" : undefined;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative rounded-2xl overflow-hidden border-2 transition-all",
                    selectedPlan === plan.tier
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50",
                    isCurrent && "bg-muted/30"
                  )}
                  onClick={() => setSelectedPlan(plan.tier)}
                >
                  {/* Badge */}
                  {badge && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                      {badge}
                    </div>
                  )}

                  {/* Card Header */}
                  <div
                    className={cn(
                      "p-4 text-white",
                      `bg-gradient-to-br ${PLAN_COLORS[plan.tier]}`
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        {PLAN_ICONS[plan.tier]}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        {plan.price_yearly === 0 ? (
                          <p className="text-sm opacity-80">永久免费</p>
                        ) : (
                          <p className="text-sm opacity-80">
                            {billingCycle === "yearly"
                              ? `约 ¥${Math.round(plan.price_yearly / 12 / 100)}/月`
                              : "随时取消"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  {plan.price_yearly > 0 && (
                    <div className="p-4 bg-background">
                      {getDisplayPrice(plan)}
                    </div>
                  )}

                  {/* Features */}
                  <div className="p-4 space-y-2">
                    {PLAN_LIMITS[plan.tier].features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}

                    {/* 限制说明 */}
                    {plan.tier === "free" && (
                      <>
                        <div className="flex items-start gap-2 opacity-60">
                          <div className="w-4 h-4 flex-shrink-0 mt-0.5 flex items-center justify-center">
                            <div className="w-3 h-0.5 bg-current rounded-full" />
                          </div>
                          <span className="text-sm line-through">艾宾浩斯单词本</span>
                        </div>
                        <div className="flex items-start gap-2 opacity-60">
                          <div className="w-4 h-4 flex-shrink-0 mt-0.5 flex items-center justify-center">
                            <div className="w-3 h-0.5 bg-current rounded-full" />
                          </div>
                          <span className="text-sm line-through">AI 对话功能</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Subscribe Button */}
                  <div className="p-4 pt-0">
                    {isCurrent ? (
                      <Button
                        className="w-full bg-muted text-foreground hover:bg-muted"
                        disabled
                      >
                        当前套餐
                      </Button>
                    ) : plan.tier === "free" ? (
                      <Button
                        className="w-full"
                        onClick={() => router.push("/app/profile")}
                        disabled={subscribing}
                      >
                        {subscribing ? "处理中..." : "使用免费版"}
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        onClick={() => router.push("/pay")}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        去购买
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">功能对比</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left font-medium">功能</th>
                    <th className="p-3 text-center font-medium">免费版</th>
                    <th className="p-3 text-center font-medium text-primary">
                      高级版
                    </th>
                    <th className="p-3 text-center font-medium text-purple-500">
                      旗舰版
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_LABELS.map((feature) => (
                    <tr
                      key={feature.key}
                      className="border-b border-border last:border-0"
                    >
                      <td className="p-3">{feature.label}</td>
                      <td className="p-3 text-center">
                        {getFeatureIcon("free", feature.key)}
                      </td>
                      <td className="p-3 text-center">
                        {getFeatureIcon("premium", feature.key)}
                      </td>
                      <td className="p-3 text-center">
                        {getFeatureIcon("flagship", feature.key)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-3">常见问题</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-1">Q: 订阅后可以退款吗？</p>
                <p className="text-foreground/60">
                  A: 订阅后7天内，如不满意可申请全额退款。
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">Q: 可以更换套餐吗？</p>
                <p className="text-foreground/60">
                  A: 可以随时升级或降级套餐，差价按比例计算。
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">Q: 订阅支持哪些支付方式？</p>
                <p className="text-foreground/60">
                  A: 支持微信支付、支付宝和信用卡支付。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          paymentMethod={paymentMethod}
          paymentStatus={paymentStatus}
          polling={polling}
          onClose={closePaymentModal}
          onSwitchMethod={switchPaymentMethod}
          onSimulatePayment={simulatePayment}
        />
      )}
    </div>
  );
}

function getFeatureIcon(plan: PlanType, feature: string): React.ReactNode {
  const limits = PLAN_LIMITS[plan];

  switch (feature) {
    case "words":
      return (
        <span className="text-xs">
          {limits.maxWords === -1 ? "无限" : `${limits.maxWords}个`}
        </span>
      );
    case "chat":
      return (
        <span className="text-xs">
          {limits.dailyChat === -1 ? "无限" : `${limits.dailyChat}条/日`}
        </span>
      );
    case "notebook":
      return plan === "free" ? (
        <div className="w-4 h-0.5 bg-foreground/20 mx-auto" />
      ) : (
        <Check className="w-4 h-4 text-green-500 mx-auto" />
      );
    case "review":
      return <Check className="w-4 h-4 text-green-500 mx-auto" />;
    case "whitelist":
    case "voice":
      return plan === "free" ? (
        <div className="w-4 h-0.5 bg-foreground/20 mx-auto" />
      ) : (
        <Check className="w-4 h-4 text-green-500 mx-auto" />
      );
    case "handwriting":
      return plan === "free" ? (
        <div className="w-4 h-0.5 bg-foreground/20 mx-auto" />
      ) : (
        <Check className="w-4 h-4 text-green-500 mx-auto" />
      );
    case "stats":
      return <Check className="w-4 h-4 text-green-500 mx-auto" />;
    case "export":
      return plan === "free" ? (
        <div className="w-4 h-0.5 bg-foreground/20 mx-auto" />
      ) : (
        <Check className="w-4 h-4 text-green-500 mx-auto" />
      );
    case "consultant":
    case "priority":
      return plan === "flagship" ? (
        <Check className="w-4 h-4 text-green-500 mx-auto" />
      ) : (
        <div className="w-4 h-0.5 bg-foreground/20 mx-auto" />
      );
    default:
      return <div className="w-4 h-0.5 bg-foreground/20 mx-auto" />;
  }
}

// Payment Modal Component
interface PaymentModalProps {
  order: PaymentOrderData;
  paymentMethod: "wechat" | "alipay";
  paymentStatus: "pending" | "success" | "failed";
  polling: boolean;
  onClose: () => void;
  onSwitchMethod: (method: "wechat" | "alipay") => void;
  onSimulatePayment: () => void;
}

function PaymentModal({
  order,
  paymentMethod,
  paymentStatus,
  polling,
  onClose,
  onSwitchMethod,
  onSimulatePayment,
}: PaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopyLink = () => {
    if (order.qrCodeUrl) {
      navigator.clipboard.writeText(order.qrCodeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">收银台</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {paymentStatus === "success" ? (
          // Success State
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckIcon2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">支付成功</h3>
            <p className="text-foreground/60">订阅已激活，即将跳转...</p>
          </div>
        ) : paymentStatus === "failed" ? (
          // Failed State
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">支付失败</h3>
            <p className="text-foreground/60 mb-4">请重新尝试支付</p>
            <Button onClick={onClose} className="w-full">
              关闭
            </Button>
          </div>
        ) : (
          // Pending State - QR Code
          <div className="p-6">
            {/* Order Info */}
            <div className="text-center mb-6">
              <p className="text-sm text-foreground/60 mb-1">{order.planName}</p>
              <p className="text-3xl font-bold">¥{(order.amount / 100).toFixed(2)}</p>
              <p className="text-sm text-foreground/60">{order.billingCycle}</p>
            </div>

            {/* Payment Method Toggle */}
            <div className="flex mb-6 bg-muted rounded-lg p-1">
              <button
                onClick={() => onSwitchMethod("wechat")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${
                  paymentMethod === "wechat"
                    ? "bg-green-500 text-white shadow"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                微信支付
              </button>
              <button
                onClick={() => onSwitchMethod("alipay")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${
                  paymentMethod === "alipay"
                    ? "bg-blue-500 text-white shadow"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                支付宝
              </button>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center border-2 border-border">
                  <QrCode className="w-40 h-40 text-foreground" />
                </div>
                {polling && (
                  <div className="absolute -bottom-1 -right-1 bg-primary text-white text-xs px-2 py-1 rounded-full animate-pulse">
                    等待支付
                  </div>
                )}
              </div>

              {/* Copy Link Button */}
              <button
                onClick={handleCopyLink}
                className="mt-4 flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
              >
                {copied ? (
                  <>
                    <CheckIcon2 className="w-4 h-4 text-green-500" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制链接
                  </>
                )}
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-center text-foreground/60 mb-2">
                请使用{paymentMethod === "wechat" ? "微信" : "支付宝"}扫描二维码完成支付
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-foreground/40">
                <div className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  打开扫一扫
                </div>
                <div className="flex items-center gap-1">
                  <QrCode className="w-3 h-3" />
                  扫描二维码
                </div>
                <div className="flex items-center gap-1">
                  <CheckIcon2 className="w-3 h-3" />
                  确认支付
                </div>
              </div>
            </div>

            {/* Expiration Timer */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">订单有效时间</span>
              <span className={`font-medium ${timeLeft < 60 ? "text-red-500" : ""}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Order Number */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-foreground/40 text-center">
                订单号: {order.orderNo}
              </p>
            </div>

            {/* Dev: Simulate Payment Button */}
            {process.env.NODE_ENV === "development" && (
              <button
                onClick={onSimulatePayment}
                className="w-full mt-4 py-2 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30 transition-colors"
              >
                ⚠️ 开发环境: 模拟支付成功
              </button>
            )}

            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="w-full mt-3 py-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
            >
              取消支付
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
