import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/reminders/send - 发送复习提醒
// 这个API可以由定时任务调用，或者用户手动触发
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { wordId } = body; // 可选：指定单词ID，否则检查所有待复习单词

  try {
    let wordsToReview: any[] = [];

    if (wordId) {
      // 检查特定单词
      const { data: word } = await supabase
        .from("word_friends")
        .select("*")
        .eq("id", wordId)
        .eq("user_id", userId)
        .single();

      if (word) {
        wordsToReview = [word];
      }
    } else {
      // 检查所有需要复习的单词（今天到期或已过期）
      const { data: words } = await supabase
        .from("word_friends")
        .select("*")
        .eq("user_id", userId)
        .lte("next_review_at", new Date().toISOString())
        .order("next_review_at", { ascending: true })
        .limit(10);

      wordsToReview = words || [];
    }

    if (wordsToReview.length === 0) {
      return NextResponse.json({
        success: true,
        message: "没有需要复习的单词",
        sent: 0,
      });
    }

    // 生成提醒消息
    const reminderMessage = generateReminderMessage(wordsToReview);

    // 为每个待复习单词发送提醒消息
    let sentCount = 0;
    for (const word of wordsToReview) {
      // 检查是否已有今天的未读提醒
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingReminder } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("user_id", userId)
        .eq("word_id", word.id)
        .eq("sender", "ai")
        .eq("message_type", "reminder")
        .gte("created_at", today.toISOString())
        .limit(1);

      if (!existingReminder || existingReminder.length === 0) {
        // 发送提醒消息
        await supabase.from("chat_messages").insert({
          user_id: userId,
          word_id: word.id,
          sender: "ai",
          message_type: "reminder",
          content: generateSingleWordReminder(word),
          is_read: false,
        });
        sentCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: reminderMessage,
      sent: sentCount,
      total: wordsToReview.length,
    });
  } catch (err: any) {
    console.error("Error sending reminders:", err);
    return NextResponse.json(
      { error: err.message || "Failed to send reminders" },
      { status: 500 }
    );
  }
}

// 生成单条单词提醒
function generateSingleWordReminder(word: any): string {
  const aiName = word.ai_name || word.word;
  const daysOverdue = Math.floor(
    (Date.now() - new Date(word.next_review_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  let urgencyLevel = "";
  let emoji = "📚";

  if (daysOverdue > 7) {
    urgencyLevel = "【紧急】";
    emoji = "🚨";
  } else if (daysOverdue > 3) {
    urgencyLevel = "【重要】";
    emoji = "⚠️";
  } else if (daysOverdue > 0) {
    urgencyLevel = "【提醒】";
    emoji = "📝";
  } else {
    emoji = "✨";
  }

  // 使用用户要求的俏皮话
  return `${emoji} ${urgencyLevel}陛下，该翻臣妾「${aiName}」的牌子了～`;
}

// 生成批量提醒消息
function generateReminderMessage(words: any[]): string {
  const now = new Date();
  const overdueCount = words.filter(
    (w) => new Date(w.next_review_at) < now
  ).length;
  const todayCount = words.filter(
    (w) => {
      const reviewDate = new Date(w.next_review_at);
      return reviewDate.toDateString() === now.toDateString();
    }
  ).length;

  let message = "";

  if (overdueCount > 0) {
    message += `🔔 你有 ${overdueCount} 个单词需要复习啦！\n\n`;
    message += `根据艾宾浩斯遗忘曲线，及时复习能大幅提升记忆效果。\n\n`;
  } else if (todayCount > 0) {
    message += `✨ 今天有 ${todayCount} 个单词到了复习时间～\n\n`;
  }

  message += `待复习单词：\n`;
  words.slice(0, 10).forEach((w, i) => {
    message += `${i + 1}. ${w.word}\n`;
  });

  message += `\n点击单词卡片开始复习吧！💪`;

  return message;
}

// GET /api/reminders/send - 获取提醒状态
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;

  // 获取待复习数量
  const { count: dueCount } = await supabase
    .from("word_friends")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("next_review_at", new Date().toISOString());

  // 获取今日已复习数量
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: reviewedCount } = await supabase
    .from("review_schedules")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("actual_review_at", today.toISOString());

  // 获取未读提醒数量
  const { data: unreadReminders } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("message_type", "reminder")
    .eq("is_read", false);

  return NextResponse.json({
    dueCount: dueCount || 0,
    reviewedToday: reviewedCount || 0,
    unreadReminders: unreadReminders?.length || 0,
  });
}
