import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/payment/invoices/[invoiceId]/download - 下载发票
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { invoiceId } = await params;

  const { data: invoice } = await supabase
    .from("payment_invoices")
    .select(`
      *,
      payment_orders (*)
    `)
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // 生成发票内容（文本格式，简化版）
  const order = invoice.payment_orders;
  const invoiceContent = [
    "════════════════════════════════════════",
    "           电  子  发  票",
    "════════════════════════════════════════",
    "",
    `发票号码: ${invoice.invoice_no}`,
    `开票日期: ${new Date(invoice.issued_at || invoice.created_at).toLocaleDateString("zh-CN")}`,
    `订单编号: ${order?.order_no || ""}`,
    "",
    "────────────────────────────────────────",
    "购 买  方  信  息",
    "────────────────────────────────────────",
    `用户ID: ${userId}`,
    invoice.invoice_title ? `发票抬头: ${invoice.invoice_title}` : "",
    `发票类型: ${invoice.invoice_type === "personal" ? "个人" : "单位"}`,
    "",
    "────────────────────────────────────────",
    "商  品  信  息",
    "────────────────────────────────────────",
    `商品名称: ${order?.product_name || ""}`,
    `计费周期: ${order?.billing_cycle === "yearly" ? "年付" : "月付"}`,
    `金额: ¥${(invoice.amount / 100).toFixed(2)}`,
    "",
    "────────────────────────────────────────",
    `合  计  金  额: ¥${(invoice.total_amount / 100).toFixed(2)}`,
    "════════════════════════════════════════",
    "",
    "  此电子发票具有法律效力，可作为",
    "  财务报销凭证使用。",
    "",
    "════════════════════════════════════════",
  ].filter(Boolean).join("\n");

  return new NextResponse(invoiceContent, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoice_${invoice.invoice_no}.txt"`,
    },
  });
}
