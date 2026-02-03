import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/reviews - 获取待复习的单词列表
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");

  // 获取需要复习的单词（next_review_at <= 现在）
  const { data: words, error: wordsError } = await supabase
    .from("word_friends")
    .select("*")
    .eq("user_id", userId)
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(limit);

  if (wordsError) {
    return NextResponse.json({ error: wordsError.message }, { status: 500 });
  }

  const wordIds = words?.map((w) => w.id) || [];

  // 获取每个单词的最新聊天消息
  const { data: latestMessages } = await supabase
    .from("chat_messages")
    .select("word_id, content, sender, created_at")
    .eq("user_id", userId)
    .in("word_id", wordIds)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  // 获取每个单词的最后一条消息（按word_id分组）
  const latestMessageMap: Record<string, { content: string; sender: string; time: string } | null> = {};
  if (latestMessages) {
    for (const msg of latestMessages) {
      if (!latestMessageMap[msg.word_id]) {
        latestMessageMap[msg.word_id] = {
          content: msg.content,
          sender: msg.sender,
          time: msg.created_at,
        };
      }
    }
  }

  // 获取未读消息数量
  const { data: unreadMessages } = await supabase
    .from("chat_messages")
    .select("word_id, id")
    .eq("user_id", userId)
    .eq("is_read", false)
    .in("word_id", wordIds);

  // 统计每个单词的未读消息数
  const unreadCount: Record<string, number> = {};
  unreadMessages?.forEach((msg) => {
    unreadCount[msg.word_id] = (unreadCount[msg.word_id] || 0) + 1;
  });

  const wordsWithInfo = words?.map((word) => ({
    ...word,
    unreadCount: unreadCount[word.id] || 0,
    lastMessage: latestMessageMap[word.id],
  }));

  return NextResponse.json({ words: wordsWithInfo });
}

// POST /api/reviews - 提交复习结果
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { wordId, result, timeSpent } = body;

  if (!wordId || !result) {
    return NextResponse.json(
      { error: "wordId and result are required" },
      { status: 400 }
    );
  }

  // 验证结果值
  const validResults = ["forgot", "hard", "good", "easy"];
  if (!validResults.includes(result)) {
    return NextResponse.json(
      { error: "Invalid result. Must be: forgot, hard, good, or easy" },
      { status: 400 }
    );
  }

  // 获取当前复习计划（如果存在）
  const { data: currentSchedule, error: scheduleError } = await supabase
    .from("review_schedules")
    .select("*")
    .eq("word_id", wordId)
    .eq("user_id", userId)
    .is("actual_review_at", null)
    .order("scheduled_at", { ascending: true })
    .limit(1);

  const schedule = currentSchedule && currentSchedule.length > 0 ? currentSchedule[0] : null;

  // 如果没有复习计划，创建初始计划（第一次复习）
  let currentStage = 1;
  let easeFactor = 2.5;

  if (schedule) {
    currentStage = schedule.stage;
    easeFactor = schedule.ease_factor;
  }

  // 计算新的复习间隔（使用艾宾浩斯间隔）
  const intervals = [0, 0.5, 1, 2, 4, 7, 15, 30];
  let newStage = currentStage;

  if (result === "forgot") {
    newStage = 1;
  } else if (result === "hard") {
    newStage = Math.max(1, currentStage);
  } else if (result === "good") {
    newStage = Math.min(intervals.length - 1, currentStage + 1);
  } else if (result === "easy") {
    newStage = Math.min(intervals.length - 1, currentStage + 2);
  }

  const intervalDays = intervals[newStage] || 1;
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  // 如果存在旧计划，更新为已完成
  if (schedule) {
    const { error: updateError } = await supabase
      .from("review_schedules")
      .update({
        actual_review_at: new Date().toISOString(),
        review_result: result,
        time_spent_seconds: timeSpent || 0,
      })
      .eq("id", schedule.id);

    if (updateError) {
      console.error("Failed to update schedule:", updateError);
    }
  }

  // 创建新的复习计划
  const { error: newScheduleError } = await supabase
    .from("review_schedules")
    .insert({
      user_id: userId,
      word_id: wordId,
      stage: newStage,
      interval_days: intervalDays,
      ease_factor: easeFactor,
      scheduled_at: nextReviewAt.toISOString(),
    });

  if (newScheduleError) {
    console.error("Failed to create new schedule:", newScheduleError);
  }

  // 更新单词的 next_review_at
  const { error: wordUpdateError } = await supabase
    .from("word_friends")
    .update({ next_review_at: nextReviewAt.toISOString() })
    .eq("id", wordId)
    .eq("user_id", userId);

  if (wordUpdateError) {
    console.error("Failed to update word:", wordUpdateError);
  }

  return NextResponse.json({
    success: true,
    nextReviewAt: nextReviewAt.toISOString(),
    stage: newStage,
    intervalDays,
  });
}
