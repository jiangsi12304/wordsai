import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { canAddWords } from "@/lib/subscription/limits";

// POST /api/words/batch - 批量添加单词
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { words, action, wordIds } = body;

  // 处理批量操作（删除、白名单等）
  if (action && Array.isArray(wordIds)) {
    return handleBatchAction(supabase, userId, action, wordIds);
  }

  // 原有的批量添加单词逻辑
  if (!Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: "Words array is required" }, { status: 400 });
  }

  if (words.length > 100) {
    return NextResponse.json({ error: "Maximum 100 words per batch" }, { status: 400 });
  }

  // 检查订阅限制 - 单词数量
  const wordCheck = await canAddWords(userId, words.length);
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

  // 检查哪些单词已存在
  const { data: existingWords } = await supabase
    .from("word_friends")
    .select("word")
    .eq("user_id", userId)
    .in("word", words.map((w: string) => w.trim().toLowerCase()));

  const existingSet = new Set(existingWords?.map((w) => w.word) || []);

  // 过滤掉已存在的单词
  const newWords = words.filter((w: string) => !existingSet.has(w.trim().toLowerCase()));

  if (newWords.length === 0) {
    return NextResponse.json({
      added: 0,
      skipped: words.length,
      message: "All words already exist",
      results: [],
    });
  }

  // 从字典获取单词信息
  const { data: dictWords } = await supabase
    .from("word_dictionary")
    .select("*")
    .in("word", newWords.map((w) => w.trim().toLowerCase()));

  const dictMap = new Map(dictWords?.map((w) => [w.word, w]) || []);

  // 批量插入单词
  // 设置1小时后的初始提醒时间
  const nextReviewTime = new Date();
  nextReviewTime.setHours(nextReviewTime.getHours() + 1);

  const wordsToInsert = newWords.map((word) => {
    const normalized = word.trim().toLowerCase();
    const dictWord = dictMap.get(normalized);
    return {
      user_id: userId,
      word: normalized,
      pronunciation: dictWord?.pronunciation || null,
      part_of_speech: dictWord?.part_of_speech?.[0] || null,
      definitions: dictWord?.definitions || [],
      frequency_rank: dictWord?.frequency_rank || null,
      difficulty_score: dictWord?.difficulty || 1,
      next_review_at: nextReviewTime.toISOString(), // 1小时后提醒
    };
  });

  const { data: insertedWords, error: insertError } = await supabase
    .from("word_friends")
    .insert(wordsToInsert)
    .select()
    .range(0, 99); // 最多100个

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 异步为每个单词生成 AI 介绍
  insertedWords?.forEach((word) => {
    generateAIIntroduction(word.id, word.word, dictMap.get(word.word)).catch(
      (err) => console.error("Failed to generate intro for", word.word, err)
    );
  });

  return NextResponse.json({
    added: insertedWords?.length || 0,
    skipped: words.length - (insertedWords?.length || 0),
    message: `Successfully added ${insertedWords?.length || 0} words`,
    results: insertedWords || [],
  });
}

// PATCH /api/words/batch - 批量更新单词
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { wordIds, action } = body;

  if (!Array.isArray(wordIds) || wordIds.length === 0) {
    return NextResponse.json({ error: "wordIds array is required" }, { status: 400 });
  }

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  return handleBatchAction(supabase, userId, action, wordIds);
}

// DELETE /api/words/batch - 批量删除单词
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean);
  const body = await request.json().catch(() => ({}));
  const wordIds = body.wordIds || ids;

  if (!Array.isArray(wordIds) || wordIds.length === 0) {
    return NextResponse.json({ error: "wordIds array is required" }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("word_friends")
    .delete()
    .eq("user_id", userId)
    .in("id", wordIds);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    deleted: wordIds.length,
    message: `Successfully deleted ${wordIds.length} words`,
  });
}

// 处理批量操作
async function handleBatchAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: string,
  wordIds: string[]
) {
  switch (action) {
    case "addToWhitelist":
    case "removeFromWhitelist": {
      const inWhitelist = action === "addToWhitelist";
      const { error } = await supabase
        .from("word_friends")
        .update({ is_in_whitelist: inWhitelist })
        .eq("user_id", userId)
        .in("id", wordIds);

      if (error) {
        console.error("Whitelist update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // 同步更新 whitelist_words 表
      if (inWhitelist) {
        const { data: words } = await supabase
          .from("word_friends")
          .select("id, word")
          .eq("user_id", userId)
          .in("id", wordIds);

        if (words) {
          for (const word of words) {
            // 使用 upsert 插入或更新白名单记录
            const { error: upsertError } = await supabase
              .from("whitelist_words")
              .upsert(
                {
                  user_id: userId,
                  word_id: word.id,
                  word: word.word,
                },
                {
                  onConflict: "user_id,word_id",
                  ignoreDuplicates: false,
                }
              );

            if (upsertError) {
              console.error("Whitelist_words upsert error:", upsertError);
            }
          }
        }
      } else {
        const { error: deleteError } = await supabase
          .from("whitelist_words")
          .delete()
          .eq("user_id", userId)
          .in("word_id", wordIds);

        if (deleteError) {
          console.error("Whitelist_words delete error:", deleteError);
        }
      }

      return NextResponse.json({
        updated: wordIds.length,
        message: `Successfully ${inWhitelist ? "added to" : "removed from"} whitelist`,
      });
    }

    case "markAsMastered": {
      const { error } = await supabase
        .from("word_friends")
        .update({ mastery_level: 5 })
        .eq("user_id", userId)
        .in("id", wordIds);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        updated: wordIds.length,
        message: `Successfully marked as mastered`,
      });
    }

    case "resetProgress": {
      const { error } = await supabase
        .from("word_friends")
        .update({
          mastery_level: 0,
          review_count: 0,
          correct_count: 0,
          next_review_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .in("id", wordIds);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        updated: wordIds.length,
        message: `Successfully reset progress`,
      });
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}

// 异步生成 AI 自我介绍
async function generateAIIntroduction(
  wordId: string,
  word: string,
  dictWord: any
) {
  const { generateWordIntro } = await import("@/lib/llm/deepseek");

  try {
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

    const supabase = await createClient();
    await supabase
      .from("word_friends")
      .update({
        ai_name: intro.aiName,
        ai_self_intro: intro.selfIntro,
        ai_personality: "friendly",
        ai_conversation_style: intro.conversationStyle,
      })
      .eq("id", wordId);
  } catch (error) {
    console.error("Error in generateAIIntroduction:", error);
  }
}
