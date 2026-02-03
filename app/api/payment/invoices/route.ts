import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/payment/invoices - 获取用户发票列表
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;

  const { data: invoices } = await supabase
    .from("payment_invoices")
    .select(`
      *,
      payment_orders (*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    invoices: invoices || [],
  });
}
