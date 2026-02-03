'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

type OrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled';
type PlanType = 'premium' | 'flagship';
type PeriodType = 'month' | 'year' | 'lifetime';

interface Plan {
  id: string;
  name: string;
  type: PlanType;
  period: PeriodType;
  price: number;
  originalPrice?: number;
  badge?: string;
}

interface PaymentOrder {
  id: string;
  email: string;
  amount: number;
  planName: string;
  planId: string;
  status: OrderStatus;
  created_at: string;
}

// 套餐配置
const PLANS: Plan[] = [
  // 高级版
  {
    id: 'premium-month',
    name: '高级版',
    type: 'premium',
    period: 'month',
    price: 3,
  },
  {
    id: 'premium-year',
    name: '高级版',
    type: 'premium',
    period: 'year',
    price: 5,
    originalPrice: 36,
    badge: '省83%',
  },
  // 旗舰版
  {
    id: 'flagship-month',
    name: '旗舰版',
    type: 'flagship',
    period: 'month',
    price: 10,
  },
  {
    id: 'flagship-year',
    name: '旗舰版',
    type: 'flagship',
    period: 'year',
    price: 15,
    originalPrice: 120,
    badge: '省87%',
  },
  {
    id: 'flagship-lifetime',
    name: '旗舰版',
    type: 'flagship',
    period: 'lifetime',
    price: 20,
    originalPrice: 999,
    badge: '超值',
  },
];

export default function PayPage() {
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[1]); // 默认选中高级版年付
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [polling, setPolling] = useState(false);

  // 根据套餐ID获取对应的收款码图片
  const getQrCodeImage = (planId: string): string => {
    const qrMap: Record<string, string> = {
      'premium-month': '/images/qr-3yuan.jpg',
      'premium-year': '/images/qr-5yuan.jpg',
      'flagship-month': '/images/qr-10yuan.jpg',
      'flagship-year': '/images/qr-15yuan.jpg',
      'flagship-lifetime': '/images/qr-20yuan.jpg',
    };
    return qrMap[planId] || '/images/qr-3yuan.jpg';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          planId: selectedPlan.id,
          amount: selectedPlan.price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '创建订单失败');
        return;
      }

      setCurrentOrder({
        id: data.orderId,
        email,
        amount: selectedPlan.price,
        planName: selectedPlan.name,
        planId: selectedPlan.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      // 开始轮询支付状态
      startPolling(data.orderId);
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (orderId: string) => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/check/${orderId}`);
        const data = await res.json();

        if (data.success && data.status === 'paid') {
          clearInterval(interval);
          setPolling(false);
          setCurrentOrder((prev) =>
            prev ? { ...prev, status: 'paid' } : null
          );
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(interval);
      setPolling(false);
    }, 600000);
  };

  const handleReset = () => {
    setEmail('');
    setCurrentOrder(null);
    setError('');
    setPolling(false);
  };

  const getPeriodLabel = (period: PeriodType) => {
    switch (period) {
      case 'month': return '月付';
      case 'year': return '年付';
      case 'lifetime': return '终身';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          选择套餐
        </h1>
        <p className="text-white/60 text-center mb-8">
          解锁全部功能，提升学习效率
        </p>

        {!currentOrder ? (
          <Card className="p-6 bg-white/10 backdrop-blur-lg border-white/20">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 套餐选择 */}
              <div className="space-y-3">
                <Label className="text-white text-base">选择套餐</Label>
                <div className="grid gap-3">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        selectedPlan.id === plan.id
                          ? plan.type === 'premium'
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-amber-500 bg-amber-500/20'
                          : 'border-white/20 bg-white/5 hover:border-white/30'
                      }`}
                    >
                      {plan.badge && (
                        <span className={`absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold rounded-full ${
                          selectedPlan.id === plan.id
                            ? 'bg-white text-purple-600'
                            : 'bg-white/20 text-white'
                        }`}>
                          {plan.badge}
                        </span>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${
                              selectedPlan.id === plan.id ? 'text-white' : 'text-white/80'
                            }`}>
                              {plan.name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              plan.type === 'premium'
                                ? 'bg-purple-500/30 text-purple-300'
                                : 'bg-amber-500/30 text-amber-300'
                            }`}>
                              {getPeriodLabel(plan.period)}
                            </span>
                          </div>
                          {plan.originalPrice && (
                            <p className="text-white/50 text-sm line-through">
                              原价 ¥{plan.originalPrice}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`text-2xl font-bold ${
                            selectedPlan.id === plan.id ? 'text-white' : 'text-white/70'
                          }`}>
                            ¥{plan.price}
                          </span>
                        </div>
                      </div>

                      {plan.period === 'lifetime' && (
                        <p className="text-white/60 text-xs mt-2">
                          一次购买，永久使用
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 邮箱输入 */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  接收兑换码的邮箱
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                <p className="text-white/50 text-xs">
                  支付成功后，兑换码将发送到此邮箱
                </p>
              </div>

              {/* 订单摘要 */}
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">订单总额</span>
                  <span className="text-2xl font-bold text-white">
                    ¥{selectedPlan.price}
                  </span>
                </div>
                <p className="text-white/50 text-sm mt-1">
                  {selectedPlan.name} · {getPeriodLabel(selectedPlan.period)}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
              >
                {loading ? '创建订单中...' : `立即支付 ¥${selectedPlan.price}`}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6 bg-white/10 backdrop-blur-lg border-white/20">
            {currentOrder.status === 'pending' ? (
              <>
                <h2 className="text-xl font-semibold text-white mb-2 text-center">
                  请扫描二维码支付
                </h2>
                <p className="text-white/60 text-center text-sm mb-6">
                  {currentOrder.planName} · ¥{currentOrder.amount}
                </p>

                <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-6">
                  <img
                    src={getQrCodeImage(currentOrder.planId)}
                    alt="支付二维码"
                    className="w-56 h-56 object-contain"
                  />
                </div>

                <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">订单号</span>
                    <span className="text-white font-mono">{currentOrder.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">支付金额</span>
                    <span className="text-white font-medium">¥{currentOrder.amount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">邮箱</span>
                    <span className="text-white">{currentOrder.email}</span>
                  </div>
                </div>

                {polling && (
                  <div className="flex items-center justify-center gap-2 text-white/70 text-sm mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    等待支付中，请扫码后稍候...
                  </div>
                )}

                <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 text-sm mb-4">
                  请在扫码支付时备注您的邮箱地址，方便管理员核对
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    支付成功！
                  </h2>
                  <p className="text-white/70">
                    兑换码已发送到您的邮箱
                  </p>
                  <p className="text-white/50 text-sm mt-2">
                    请查收邮件并使用兑换码
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">订单号</span>
                    <span className="text-white font-mono">{currentOrder.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">套餐</span>
                    <span className="text-white">{currentOrder.planName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">邮箱</span>
                    <span className="text-white">{currentOrder.email}</span>
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              {currentOrder.status === 'paid' ? '完成' : '返回修改订单'}
            </Button>
          </Card>
        )}

        {/* 底部说明 */}
        <div className="mt-6 text-center text-white/40 text-xs">
          <p>支付后请等待管理员确认，通常在 5 分钟内完成</p>
          <p className="mt-1">如有问题请联系客服</p>
        </div>
      </div>
    </div>
  );
}
