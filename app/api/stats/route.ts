import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/stats - 获取用户学习统计
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "week"; // week, month, all

  // 计算日期范围
  const now = new Date();
  let startDate: Date;

  if (range === "week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === "month") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }

  const startDateStr = startDate.toISOString().split("T")[0];

  // 获取单词统计
  const { data: wordStats } = await supabase
    .from("word_friends")
    .select("*")
    .eq("user_id", userId);

  const totalWords = wordStats?.length || 0;
  const masteredWords = wordStats?.filter((w) => (w.mastery_level || 0) >= 4).length || 0;

  // 从 review_schedules 表获取真实的复习数据
  const { data: reviewSchedules } = await supabase
    .from("review_schedules")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", startDateStr);

  // 计算总复习次数和正确率
  const totalReviews = reviewSchedules?.length || 0;
  let correctReviews = 0;
  reviewSchedules?.forEach((r) => {
    if (r.review_result === "good" || r.review_result === "easy") {
      correctReviews++;
    }
  });
  const accuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;

  // 计算掌握度分布（基于复习阶段）
  const masteryDistribution = [0, 1, 2, 3, 4, 5].map((level) => ({
    level,
    count: wordStats?.filter((w) => (w.mastery_level || 0) === level).length || 0,
  }));

  // 获取每日统计（真实数据）
  const { data: dailyStatsData } = await supabase
    .from("learning_stats")
    .select("*")
    .eq("user_id", userId)
    .gte("stat_date", startDateStr)
    .order("stat_date", { ascending: true });

  // 转换为图表所需格式
  const dailyStats = (dailyStatsData || []).map((s) => ({
    date: s.stat_date,
    newWords: s.new_words_learned || 0,
    reviews: s.reviews_completed || 0,
    accuracy:
      s.reviews_completed > 0
        ? (s.reviews_correct || 0) / s.reviews_completed
        : 0,
  }));

  // 如果没有足够数据，补充空日期（显示0而不是随机数据）
  const chartData = fillMissingDates(dailyStats, startDateStr, range);

  // 从真实数据生成学习热力图
  const weeklyHeatmap = await generateRealWeeklyHeatmap(supabase, userId);

  // 计算连续天数
  const streakResult = await calculateStreak(supabase, userId);
  const streakDays = streakResult.current;

  return NextResponse.json({
    totalWords,
    masteredWords,
    reviewsCompleted: totalReviews,
    accuracy,
    streakDays,
    dailyStats: chartData,
    masteryDistribution,
    weeklyHeatmap,
  });
}

// 填充缺失的日期（显示为0数据，而不是随机数据）
function fillMissingDates(
  existingData: Array<{ date: string; newWords: number; reviews: number; accuracy: number }>,
  startDateStr: string,
  range: string
) {
  const days = range === "week" ? 7 : range === "month" ? 30 : 90;
  const result: Array<{ date: string; newWords: number; reviews: number; accuracy: number }> = [];
  const dataMap = new Map(existingData.map((d) => [d.date, d]));

  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    if (dataMap.has(dateStr)) {
      result.push(dataMap.get(dateStr)!);
    } else {
      result.push({
        date: dateStr,
        newWords: 0,
        reviews: 0,
        accuracy: 0,
      });
    }
  }

  return result;
}

// 从真实数据生成学习热力图
async function generateRealWeeklyHeatmap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 获取本周的学习活动记录
  const { data: activities } = await supabase
    .from("learning_stats")
    .select("*")
    .eq("user_id", userId)
    .gte("stat_date", weekAgo.toISOString().split("T")[0])
    .order("stat_date", { ascending: true });

  // 获取聊天记录作为学习时间参考
  const { data: chatMessages } = await supabase
    .from("chat_messages")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", weekAgo.toISOString());

  // 初始化热力图（7天 x 12小时段，每2小时一段）
  const heatmap = Array.from({ length: 7 }, (_, dayIndex) => ({
    day: `day-${dayIndex}`,
    hours: Array.from({ length: 12 }, () => 0),
  }));

  // 填充真实学习时间数据
  chatMessages?.forEach((msg) => {
    const msgDate = new Date(msg.created_at);
    const dayOfWeek = (msgDate.getDay() + 6) % 7; // 周一=0
    const hour = msgDate.getHours();
    const hourIndex = Math.floor((hour - 6) / 2); // 从6点开始，每2小时一段

    if (hourIndex >= 0 && hourIndex < 12 && dayOfWeek >= 0 && dayOfWeek < 7) {
      heatmap[dayOfWeek].hours[hourIndex] += 1; // 每条消息算1分钟
    }
  });

  return heatmap;
}

// POST /api/stats - 记录学习活动
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { type, ...restData } = body;

  const today = new Date();
  const todayDate = today.toISOString().split("T")[0];
  const currentHour = today.getHours();

  try {
    switch (type) {
      case "new_word":
        // 记录学习新单词
        await supabase
          .from("learning_stats")
          .upsert(
            {
              user_id: userId,
              stat_date: todayDate,
              new_words_learned: 1,
            },
            {
              onConflict: "user_id,stat_date",
              ignoreDuplicates: false,
            }
          );

        // 增加 new_words_learned
        await supabase.rpc("increment_stat", {
          p_user_id: userId,
          p_stat_date: todayDate,
          p_field: "new_words_learned",
          p_amount: 1,
        });
        break;

      case "review":
        // 记录复习活动
        const { result, timeSpent } = restData;
        const isCorrect = result === "good" || result === "easy";

        await supabase
          .from("learning_stats")
          .upsert(
            {
              user_id: userId,
              stat_date: todayDate,
              reviews_completed: 1,
              reviews_correct: isCorrect ? 1 : 0,
              reviews_forgot: result === "forgot" ? 1 : 0,
              time_spent_seconds: timeSpent || 0,
            },
            {
              onConflict: "user_id,stat_date",
              ignoreDuplicates: false,
            }
          );
        break;

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error recording stats:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 计算连续学习天数
async function calculateStreak(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ current: number; longest: number }> {
  const { data: stats } = await supabase
    .from("learning_stats")
    .select("stat_date, new_words_learned, reviews_completed")
    .eq("user_id", userId)
    .gte("stat_date", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]) // 最近一年
    .order("stat_date", { ascending: false });

  if (!stats || stats.length === 0) {
    return { current: 0, longest: 0 };
  }

  // 计算当前连续天数
  let currentStreak = 0;
  const today = new Date().toISOString().split("T")[0];
  let checkDate = new Date();

  // 从今天开始检查
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const dayStat = stats.find((s) => s.stat_date === dateStr);

    if (!dayStat || (dayStat.new_words_learned === 0 && dayStat.reviews_completed === 0)) {
      break;
    }
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // 计算最长连续天数
  let longestStreak = 0;
  let tempStreak = 0;

  const sortedDates = [...stats]
    .sort((a, b) => a.stat_date.localeCompare(b.stat_date))
    .map((s) => s.stat_date);

  for (let i = 0; i < sortedDates.length; i++) {
    const stat = stats.find((s) => s.stat_date === sortedDates[i]);
    if (stat && (stat.new_words_learned > 0 || stat.reviews_completed > 0)) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { current: currentStreak, longest: longestStreak };
}
