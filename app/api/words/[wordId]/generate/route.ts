import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateWordIntro } from "@/lib/llm/deepseek";

// POST /api/words/[wordId]/generate - 生成详细单词数据
export async function POST(
  request: Request,
  { params }: { params: Promise<{ wordId: string }> }
) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { wordId } = await params;

  // 检查是否强制重新生成
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";

  // 获取单词信息
  const { data: word } = await supabase
    .from("word_friends")
    .select("*")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (!word) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  // 检查是否已有扩展数据（非强制模式下才检查）
  // 只要有 metadata 且包含有效内容就认为已缓存
  const hasCachedData = word.metadata &&
    Object.keys(word.metadata).length > 0 &&
    (word.metadata.detailedDefinitions || word.metadata.etymology || word.metadata.synonyms);

  if (!force && hasCachedData) {
    return NextResponse.json({
      extendedData: word.metadata,
      message: "Extended data already exists"
    });
  }

  try {
    // 调用 AI 生成详细数据
    const intro = await generateWordIntro({
      word: word.word,
      pronunciation: word.pronunciation || undefined,
      definitions: word.definitions || [],
      examples: [],
      frequency: word.frequency_rank ? "常见" : "普通",
      difficulty: word.difficulty_score || 1,
      userLevel: "beginner",
      personalityType: "friendly",
    });

    if (!intro) {
      return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
    }

    // 检查是否为 fallback 占位符数据
    const isFallback = intro.detailedDefinitions?.[0]?.definition?.includes("Click") ||
                       intro.detailedDefinitions?.[0]?.chinese?.includes("点击") ||
                       intro.etymology?.includes("点击") ||
                       intro.memoryTips?.[0]?.includes("点击");

    if (isFallback) {
      console.log("AI 生成失败，返回的是 fallback 占位符数据");
      return NextResponse.json({
        error: "AI 服务暂时不可用，请稍后再试",
        isFallback: true
      }, { status: 503 });
    }

    // 构建扩展数据
    const extendedData = {
      detailedDefinitions: intro.detailedDefinitions,
      synonyms: intro.synonyms,
      antonyms: intro.antonyms,
      similarWords: intro.similarWords,
      etymology: intro.etymology,
      memoryTips: intro.memoryTips,
    };

    console.log("生成的扩展数据:", JSON.stringify(extendedData, null, 2));

    // 更新数据库
    const { error: updateError } = await supabase
      .from("word_friends")
      .update({
        metadata: extendedData,
        ai_name: intro.aiName || null,
        ai_self_intro: intro.selfIntro || null,
        ai_conversation_style: intro.conversationStyle || null,
      })
      .eq("id", wordId);

    if (updateError) {
      console.error("Database update error:", updateError);
      console.error("Error details:", {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
      });
      return NextResponse.json({
        error: `保存失败: ${updateError.message}`,
        details: updateError.details
      }, { status: 500 });
    }

    return NextResponse.json({ extendedData });
  } catch (error: any) {
    console.error("Error generating extended data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate extended data" },
      { status: 500 }
    );
  }
}
