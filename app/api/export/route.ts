import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkFeatureAccess } from "@/lib/subscription/limits";

// GET /api/export - 导出用户学习数据（CSV格式）
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv"; // csv or json

  // 检查是否有导出权限（高级版以上）
  const access = await checkFeatureAccess(userId, "canExport");
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason || "需要高级版或更高订阅才能导出数据" },
      { status: 403 }
    );
  }

  try {
    // 获取用户的所有单词
    const { data: words, error: wordsError } = await supabase
      .from("word_friends")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (wordsError) {
      return NextResponse.json({ error: wordsError.message }, { status: 500 });
    }

    // 获取学习统计
    const { data: stats } = await supabase
      .from("learning_stats")
      .select("*")
      .eq("user_id", userId)
      .order("stat_date", { ascending: false })
      .limit(365);

    // 获取复习记录
    const { data: reviews } = await supabase
      .from("review_schedules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (format === "json") {
      // JSON 格式导出
      const jsonData = {
        exportDate: new Date().toISOString(),
        words: words || [],
        stats: stats || [],
        reviews: reviews || [],
      };

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="word-learning-data-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    // CSV 格式导出
    const csvRows: string[] = [];

    // 单词数据 CSV
    csvRows.push("# 单词列表");
    csvRows.push("单词,发音,词性,释义,掌握度,复习次数,添加时间,下次复习");

    for (const word of words || []) {
      const pronunciation = word.pronunciation || "";
      const partOfSpeech = word.part_of_speech || "";
      const definitions = Array.isArray(word.definitions)
        ? word.definitions.join("; ")
        : "";
      const masteryLevel = word.mastery_level || 0;
      const reviewCount = word.review_count || 0;
      const addedAt = new Date(word.created_at).toLocaleDateString("zh-CN");
      const nextReview = word.next_review_at
        ? new Date(word.next_review_at).toLocaleDateString("zh-CN")
        : "";

      csvRows.push(
        `"${word.word}","${pronunciation}","${partOfSpeech}","${definitions}",${masteryLevel},${reviewCount},"${addedAt}","${nextReview}"`
      );
    }

    csvRows.push("");
    csvRows.push("# 学习统计");

    if (stats && stats.length > 0) {
      csvRows.push("日期,新学单词,复习次数,正确次数,遗忘次数,学习时长(秒)");

      for (const stat of stats) {
        const date = stat.stat_date;
        const newWords = stat.new_words_learned || 0;
        const reviews = stat.reviews_completed || 0;
        const correct = stat.reviews_correct || 0;
        const forgot = stat.reviews_forgot || 0;
        const timeSpent = stat.time_spent_seconds || 0;

        csvRows.push(
          `"${date}",${newWords},${reviews},${correct},${forgot},${timeSpent}`
        );
      }
    }

    // 计算汇总统计
    const totalWords = words?.length || 0;
    const masteredWords = words?.filter((w) => (w.mastery_level || 0) >= 4).length || 0;
    const totalReviews = reviews?.length || 0;

    csvRows.push("");
    csvRows.push("# 汇总统计");
    csvRows.push(`总单词数,${totalWords}`);
    csvRows.push(`已掌握单词,${masteredWords}`);
    csvRows.push(`总复习次数,${totalReviews}`);
    csvRows.push(`导出日期,${new Date().toLocaleString("zh-CN")}`);

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="word-learning-data-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
