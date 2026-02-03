'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { orderStatusText } from '@/lib/payment';

type OrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

interface PaymentOrder {
  id: string;
  email: string;
  amount: number;
  status: OrderStatus;
  payment_method: string;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  paid_at: string | null;
  redemption_code?: string;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 获取订单列表
  const fetchOrders = async () => {
    setLoading(true);
    setError('');

    try {
      const statusParam = statusFilter ? `&status=${statusFilter}` : '';
      const res = await fetch(
        `/api/payment/orders?adminKey=${encodeURIComponent(adminKey)}${statusParam}`
      );

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setAuthenticated(false);
          setError('管理员密钥无效');
        } else {
          setError(data.error || '获取订单失败');
        }
        setOrders([]);
        return;
      }

      setAuthenticated(true);
      setOrders(data.orders || []);
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 确认支付
  const handleConfirm = async (orderId: string) => {
    setConfirming(orderId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          adminKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '确认失败');
        return;
      }

      // 显示成功消息，包含邮件发送状态
      if (data.emailSent) {
        setSuccess(`✓ 订单已确认，兑换码: ${data.code}，邮件已发送`);
      } else if (data.emailError) {
        setSuccess(`✓ 订单已确认，兑换码: ${data.code}，邮件发送失败: ${data.emailError}`);
      } else {
        setSuccess(`✓ 订单已确认，兑换码: ${data.code}`);
      }

      fetchOrders(); // 刷新订单列表
    } catch (err) {
      setError('网络错误');
    } finally {
      setConfirming(null);
    }
  };

  // 过滤后的订单
  useEffect(() => {
    if (authenticated) {
      fetchOrders();
    }
  }, [statusFilter]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 bg-white/10 backdrop-blur-lg border-white/20">
          <h1 className="text-2xl font-bold text-white text-center mb-6">
            管理后台
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminKey" className="text-white">
                管理员密钥
              </Label>
              <Input
                id="adminKey"
                type="password"
                placeholder="输入管理员密钥"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !adminKey}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? '验证中...' : '登录'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">订单管理</h1>

          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as OrderStatus | '')
              }
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="">全部状态</option>
              <option value="pending">待支付</option>
              <option value="paid">已支付</option>
              <option value="expired">已过期</option>
              <option value="cancelled">已取消</option>
            </select>

            <Button
              onClick={fetchOrders}
              disabled={loading}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              {loading ? '刷新中...' : '刷新'}
            </Button>

            <Button
              onClick={() => {
                setAuthenticated(false);
                setAdminKey('');
              }}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              退出
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        <div className="grid gap-4">
          {orders.length === 0 ? (
            <Card className="p-8 text-center bg-white/10 backdrop-blur-lg border-white/20">
              <p className="text-white/70">暂无订单</p>
            </Card>
          ) : (
            orders.map((order) => (
              <Card
                key={order.id}
                className="p-4 bg-white/10 backdrop-blur-lg border-white/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-white/50">订单号</p>
                      <p className="text-white font-mono">
                        {order.id.slice(0, 8)}...
                      </p>
                    </div>
                    <div>
                      <p className="text-white/50">邮箱</p>
                      <p className="text-white">{order.email}</p>
                    </div>
                    <div>
                      <p className="text-white/50">套餐</p>
                      <p className="text-white">{order.notes || '-'}</p>
                    </div>
                    <div>
                      <p className="text-white/50">金额</p>
                      <p className="text-white font-medium">¥{order.amount}</p>
                    </div>
                    <div>
                      <p className="text-white/50">状态</p>
                      <p
                        className={`font-medium ${
                          order.status === 'paid'
                            ? 'text-green-400'
                            : order.status === 'pending'
                            ? 'text-yellow-400'
                            : 'text-white/70'
                        }`}
                      >
                        {orderStatusText[order.status]}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-white/50">创建时间</p>
                      <p className="text-white">
                        {new Date(order.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/50">支付方式</p>
                      <p className="text-white">
                        {order.payment_method === 'wechat' ? '微信' : '支付宝'}
                      </p>
                    </div>
                    {order.paid_at && (
                      <div>
                        <p className="text-white/50">支付时间</p>
                        <p className="text-white">
                          {new Date(order.paid_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    )}
                  </div>

                  {order.status === 'pending' && (
                    <Button
                      onClick={() => handleConfirm(order.id)}
                      disabled={confirming === order.id}
                      className="bg-green-600 hover:bg-green-700 text-white ml-4"
                    >
                      {confirming === order.id ? '处理中...' : '确认收款'}
                    </Button>
                  )}

                  {order.status === 'paid' && order.redemption_code && (
                    <div className="ml-4 flex flex-col gap-2">
                      <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                        <p className="text-green-400 text-xs mb-1">兑换码</p>
                        <p className="text-white font-mono text-lg tracking-wider">{order.redemption_code}</p>
                      </div>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(order.redemption_code!);
                          setSuccess('兑换码已复制到剪贴板');
                        }}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10 text-sm"
                      >
                        复制兑换码
                      </Button>
                    </div>
                  )}
                </div>

                {order.admin_notes && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-white/50 text-sm">备注: {order.admin_notes}</p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
