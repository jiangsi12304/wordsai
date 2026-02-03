"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  FileText,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Crown,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  order_no: string;
  product_name: string;
  billing_cycle: string;
  amount: number;
  payment_status: string;
  payment_method: string;
  paid_at: string;
  created_at: string;
  subscription_plans?: {
    name: string;
    tier: string;
  };
}

interface Invoice {
  id: string;
  invoice_no: string;
  status: string;
  issued_at: string;
  file_url: string;
}

interface OrderDetail {
  order: Order;
  invoice?: Invoice;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<{
    totalOrders: number;
    totalAmount: number;
    pendingOrders: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/payment/orders");
      const data = await res.json();
      setOrders(data.orders || []);
      setStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderDetail = async (orderId: string) => {
    try {
      const res = await fetch(`/api/payment/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data);
      }
    } catch (error) {
      console.error("Failed to fetch order detail:", error);
    }
  };

  const handleApplyInvoice = async (orderId: string) => {
    setInvoiceLoading(true);
    try {
      const res = await fetch(`/api/payment/orders/${orderId}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceType: "personal",
          invoiceTitle: "个人",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // 刷新订单详情
        await handleOrderDetail(orderId);
        alert("发票开具成功！");
      } else {
        alert(data.error || "开票失败");
      }
    } catch (error) {
      console.error("Failed to apply invoice:", error);
      alert("开票失败");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNo: string) => {
    try {
      const res = await fetch(`/api/payment/invoices/${invoiceId}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice_${invoiceNo}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to download invoice:", error);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "success":
        return {
          label: "支付成功",
          color: "bg-green-500",
          textColor: "text-green-500",
          icon: CheckCircle,
        };
      case "pending":
        return {
          label: "待支付",
          color: "bg-orange-500",
          textColor: "text-orange-500",
          icon: Clock,
        };
      case "failed":
        return {
          label: "支付失败",
          color: "bg-red-500",
          textColor: "text-red-500",
          icon: XCircle,
        };
      case "refunded":
        return {
          label: "已退款",
          color: "bg-gray-500",
          textColor: "text-gray-500",
          icon: RefreshCw,
        };
      default:
        return {
          label: "未知",
          color: "bg-gray-500",
          textColor: "text-gray-500",
          icon: FileText,
        };
    }
  };

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
          <h1 className="text-lg font-semibold">我的订单</h1>
          <button
            onClick={fetchOrders}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
          </div>
        ) : (
          <>
            {/* 统计卡片 */}
            {stats && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  <p className="text-xs opacity-80">总订单数</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                  <p className="text-2xl font-bold">¥{(stats.totalAmount / 100).toFixed(0)}</p>
                  <p className="text-xs opacity-80">累计消费</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                  <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                  <p className="text-xs opacity-80">待支付</p>
                </div>
              </div>
            )}

            {/* 订单列表 */}
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-medium mb-2">暂无订单</h2>
                <p className="text-sm text-foreground/60 text-center mb-4">
                  前往订阅页面购买套餐
                </p>
                <button
                  onClick={() => router.push("/app/subscription")}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                >
                  查看套餐
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const status = getStatusInfo(order.payment_status);
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={order.id}
                      className="bg-card border border-border rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusIcon className={`w-4 h-4 ${status.textColor}`} />
                            <span className="font-medium">{order.product_name}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${status.color} text-white`}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/60 mb-1">
                            订单号: {order.order_no}
                          </p>
                          <p className="text-sm text-foreground/60">
                            {order.billing_cycle === "monthly" ? "月付" : "年付"} · ¥{(order.amount / 100).toFixed(2)}
                          </p>
                          {order.paid_at && (
                            <p className="text-xs text-foreground/40">
                              支付时间: {new Date(order.paid_at).toLocaleString("zh-CN")}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOrderDetail(order.id)}
                          >
                            详情
                          </Button>
                          {order.payment_status === "success" && (
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                setSelectedOrder({ order } as OrderDetail);
                                setShowInvoiceModal(true);
                              }}
                            >
                              <Crown className="w-4 h-4" />
                              发票
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 订单详情弹窗 */}
      {selectedOrder && !showInvoiceModal && (
        <OrderDetailModal
          orderDetail={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* 发票弹窗 */}
      {showInvoiceModal && selectedOrder && (
        <InvoiceModal
          orderDetail={selectedOrder}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedOrder(null);
          }}
          onApplyInvoice={handleApplyInvoice}
          onDownloadInvoice={handleDownloadInvoice}
          loading={invoiceLoading}
        />
      )}
    </div>
  );
}

function OrderDetailModal({
  orderDetail,
  onClose,
}: {
  orderDetail: OrderDetail;
  onClose: () => void;
}) {
  const { order, invoice } = orderDetail;
  const statusInfo = {
    success: { label: "支付成功", color: "text-green-500" },
    pending: { label: "待支付", color: "text-orange-500" },
    failed: { label: "支付失败", color: "text-red-500" },
    refunded: { label: "已退款", color: "text-gray-500" },
  };

  const status = statusInfo[order.payment_status as keyof typeof statusInfo] || statusInfo.pending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">订单详情</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-foreground/60">订单状态</p>
            <p className={`font-medium ${status.color}`}>
              {status.label}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-foreground/60">订单编号</p>
              <p className="text-sm font-medium">{order.order_no}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/60">创建时间</p>
              <p className="text-sm font-medium">
                {new Date(order.created_at).toLocaleString("zh-CN")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-foreground/60">商品名称</p>
              <p className="text-sm font-medium">{order.product_name}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/60">计费周期</p>
              <p className="text-sm font-medium">
                {order.billing_cycle === "monthly" ? "月付" : "年付"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-foreground/60">支付金额</p>
            <p className="text-2xl font-bold">¥{(order.amount / 100).toFixed(2)}</p>
          </div>

          {order.paid_at && (
            <div>
              <p className="text-sm text-foreground/60">支付时间</p>
              <p className="text-sm font-medium">
                {new Date(order.paid_at).toLocaleString("zh-CN")}
              </p>
            </div>
          )}

          {invoice && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground/60">发票号码</p>
                  <p className="text-sm font-medium">{invoice.invoice_no}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-600 rounded">
                  已开票
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );
}

function InvoiceModal({
  orderDetail,
  onClose,
  onApplyInvoice,
  onDownloadInvoice,
  loading,
}: {
  orderDetail: OrderDetail;
  onClose: () => void;
  onApplyInvoice: (orderId: string) => Promise<void>;
  onDownloadInvoice: (invoiceId: string, invoiceNo: string) => Promise<void>;
  loading: boolean;
}) {
  const { order, invoice } = orderDetail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            电子发票
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 发票状态 */}
          {invoice ? (
            <>
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                  ✓ 发票已开具
                </p>
                <p className="text-xs text-foreground/60">
                  发票号: {invoice.invoice_no}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => onDownloadInvoice(invoice.id, invoice.invoice_no)}
                >
                  <Download className="w-4 h-4" />
                  下载发票
                </Button>
                <Button onClick={onClose} className="flex-1">
                  关闭
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <FileText className="w-12 h-12 mx-auto text-foreground/40 mb-2" />
                <p className="text-sm text-foreground/60 mb-3">
                  您尚未为此订单开具发票
                </p>
                <Button
                  onClick={() => onApplyInvoice(order.id)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      开票中...
                    </>
                  ) : (
                    "开具发票"
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={onClose}
                className="w-full"
              >
                稍后再开
              </Button>
            </>
          )}

          {/* 发票说明 */}
          <div className="text-xs text-foreground/40 space-y-1">
            <p>• 电子发票与纸质发票具有同等法律效力</p>
            <p>• 发票内容包含订单金额和商品信息</p>
            <p>• 如有疑问请联系客服</p>
          </div>
        </div>
      </div>
    </div>
  );
}
