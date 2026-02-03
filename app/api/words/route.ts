import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateWordIntro } from "@/lib/llm/deepseek";
import { canAddWords, formatSubscriptionResponse } from "@/lib/subscription/limits";

// GET /api/words - 获取用户的单词列表
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const whitelist = searchParams.get("whitelist");
  const withMessages = searchParams.get("withMessages") === "true";

  let query = supabase
    .from("word_friends")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("word", `%${search}%`);
  }

  if (whitelist === "true") {
    query = query.eq("is_in_whitelist", true);
  }

  const { data: words, error: wordsError } = await query;

  if (wordsError) {
    return NextResponse.json({ error: wordsError.message }, { status: 500 });
  }

  // 如果需要获取最新聊天消息
  if (withMessages && words && words.length > 0) {
    const wordIds = words.map((w) => w.id);

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

    const unreadCount: Record<string, number> = {};
    unreadMessages?.forEach((msg) => {
      unreadCount[msg.word_id] = (unreadCount[msg.word_id] || 0) + 1;
    });

    // 添加最新消息和未读数到每个单词
    const wordsWithInfo = words.map((word) => ({
      ...word,
      unreadCount: unreadCount[word.id] || 0,
      lastMessage: latestMessageMap[word.id],
    }));

    // 按最新消息时间排序
    wordsWithInfo.sort((a: any, b: any) => {
      const timeA = a.lastMessage?.time || a.created_at;
      const timeB = b.lastMessage?.time || b.created_at;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    return NextResponse.json({ words: wordsWithInfo });
  }

  return NextResponse.json({ words });
}

// POST /api/words - 添加新单词
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { word } = body;

  if (!word || typeof word !== "string") {
    return NextResponse.json({ error: "Word is required" }, { status: 400 });
  }

  // 检查订阅限制 - 单词数量
  const wordCheck = await canAddWords(userId, 1);
  if (!wordCheck.allowed) {
    return NextResponse.json(
      {
        error: wordCheck.reason,
        limitReached: true,
        currentLimit: wordCheck.currentLimit,
        requiresUpgrade: true,
      },
      { status: 403 }
    );
  }

  // 检查单词是否已存在
  const { data: existing } = await supabase
    .from("word_friends")
    .select("id")
    .eq("user_id", userId)
    .eq("word", word.trim().toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Word already exists", wordId: existing.id },
      { status: 409 }
    );
  }

  // 从字典获取单词信息（如果存在）
  const { data: dictWord } = await supabase
    .from("word_dictionary")
    .select("*")
    .ilike("word", word.trim().toLowerCase())
    .single();

  // 创建新单词好友
  const normalizedWord = word.trim().toLowerCase();
  // 设置1小时后的初始提醒时间
  const nextReviewTime = new Date();
  nextReviewTime.setHours(nextReviewTime.getHours() + 1);

  const { data: newWord, error: insertError } = await supabase
    .from("word_friends")
    .insert({
      user_id: userId,
      word: normalizedWord,
      pronunciation: dictWord?.pronunciation || null,
      part_of_speech: dictWord?.part_of_speech?.[0] || null,
      definitions: dictWord?.definitions || [],
      frequency_rank: dictWord?.frequency_rank || null,
      difficulty_score: dictWord?.difficulty || 1,
      next_review_at: nextReviewTime.toISOString(), // 1小时后提醒
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 创建初始复习计划
  const { error: scheduleError } = await supabase
    .from("review_schedules")
    .insert({
      user_id: userId,
      word_id: newWord.id,
      stage: 1,
      interval_days: 0,
      ease_factor: 2.5,
      scheduled_at: new Date().toISOString(),
    });

  if (scheduleError) {
    console.error("Failed to create initial schedule:", scheduleError);
  }

  // 异步生成 AI 自我介绍（不阻塞响应）
  generateAIIntroduction(newWord.id, normalizedWord, dictWord).catch((err) => {
    console.error("Failed to generate AI intro:", err);
  });

  return NextResponse.json({ word: newWord }, { status: 201 });
}

// 异步生成 AI 自我介绍和详细单词档案
async function generateAIIntroduction(
  wordId: string,
  word: string,
  dictWord: any
) {
  try {
    // 生成 AI 自我介绍和详细档案
    const intro = await generateWordIntro({
      word,
      pronunciation: dictWord?.pronunciation,
      definitions: dictWord?.definitions,
      examples: dictWord?.examples,
      frequency: dictWord?.frequency_rank ? "常见" : "普通",
      difficulty: dictWord?.difficulty || 1,
      userLevel: "beginner",
      personalityType: "friendly",
    });

    if (!intro) return;

    // 构建扩展数据（使用 JSONB 格式）
    const extendedData = {
      detailedDefinitions: intro.detailedDefinitions,
      synonyms: intro.synonyms,
      antonyms: intro.antonyms,
      similarWords: intro.similarWords,
      etymology: intro.etymology,
      memoryTips: intro.memoryTips,
    };

    // 更新单词的 AI 信息和扩展数据
    const supabase = await createClient();
    await supabase
      .from("word_friends")
      .update({
        ai_name: intro.aiName,
        ai_self_intro: intro.selfIntro,
        ai_personality: "friendly",
        ai_conversation_style: intro.conversationStyle,
        // 存储扩展数据到 definitions 字段（JSONB）
        definitions: intro.detailedDefinitions.length > 0
          ? intro.detailedDefinitions
          : dictWord?.definitions || [],
        // 使用 metadata 字段存储其他扩展数据
        metadata: extendedData,
      })
      .eq("id", wordId);

    // 创建 AI 欢迎消息（包含自我介绍）
    const { data: wordData } = await supabase
      .from("word_friends")
      .select("user_id")
      .eq("id", wordId)
      .single();

    if (wordData) {
      // 构建完整的欢迎消息
      const welcomeMessage = buildWelcomeMessage(word, intro);
      await supabase.from("chat_messages").insert({
        user_id: wordData.user_id,
        word_id: wordId,
        sender: "ai",
        message_type: "text",
        content: welcomeMessage,
        ai_model_used: "deepseek-r1",
        is_read: false,
      });
    }
  } catch (error) {
    console.error("Error in generateAIIntroduction:", error);
  }
}

// 构建完整的欢迎消息
function buildWelcomeMessage(word: string, intro: any): string {
  const lines = [
    `👋 嗨！我是 ${intro.aiName}，很高兴认识你！`,
    "",
    intro.selfIntro,
    "",
    "📚 **记忆技巧**：",
    ...intro.memoryTips.map((tip: string, i: number) => `${i + 1}. ${tip}`),
  ];

  // 添加近义词
  if (intro.synonyms && intro.synonyms.length > 0) {
    lines.push("");
    lines.push("🔄 **近义词**：");
    intro.synonyms.forEach((syn: any) => {
      lines.push(`• ${syn.word} ${syn.pronunciation} - ${syn.definition}`);
    });
  }

  // 添加反义词
  if (intro.antonyms && intro.antonyms.length > 0) {
    lines.push("");
    lines.push("💫 **反义词**：");
    intro.antonyms.forEach((ant: any) => {
      lines.push(`• ${ant.word} ${ant.pronunciation} - ${ant.definition}`);
    });
  }

  // 添加形近词
  if (intro.similarWords && intro.similarWords.length > 0) {
    lines.push("");
    lines.push("🔍 **形近词**（注意区分）：");
    intro.similarWords.forEach((sim: any) => {
      lines.push(`• ${sim.word} ${sim.pronunciation} - ${sim.difference}`);
    });
  }

  // 添加词根词缀
  if (intro.etymology) {
    lines.push("");
    lines.push("🧩 **词根词缀**：");
    lines.push(intro.etymology);
  }

  lines.push("");
  lines.push("让我们开始学习吧！有什么问题随时问我～ 😊");

  return lines.join("\n");
}
