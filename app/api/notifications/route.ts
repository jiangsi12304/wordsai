import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateReviewReminder } from "@/lib/algorithms/ebbinghaus";

// GET /api/notifications - 获取待发送的通知
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "10");

  // 获取需要复习的单词
  const { data: words } = await supabase
    .from("word_friends")
    .select("*")
    .eq("user_id", userId)
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(limit);

  if (!words || words.length === 0) {
    return NextResponse.json({ notifications: [] });
  }

  // 生成通知消息
  const notifications = words.map((word) => {
    const lastReview = word.last_reviewed_at
      ? new Date(word.last_reviewed_at)
      : null;
    const daysSince = lastReview
      ? Math.floor((Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: word.id,
      type: "review_reminder",
      word: word.word,
      wordId: word.id,
      aiName: word.ai_name,
      message: generateReviewReminder(word.word, daysSince, word.mastery_level || 0),
      priority: word.mastery_level && word.mastery_level < 3 ? "high" : "normal",
      scheduledAt: word.next_review_at,
    };
  });

  return NextResponse.json({ notifications });
}

// POST /api/notifications - 标记通知为已读
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { notificationIds } = body;

  // 标记相关消息为已读
  if (Array.isArray(notificationIds) && notificationIds.length > 0) {
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .in("word_id", notificationIds)
      .eq("sender", "ai");
  }

  return NextResponse.json({ success: true });
}
