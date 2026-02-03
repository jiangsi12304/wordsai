import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { chatWithWord } from "@/lib/llm/zhipu";
import { generateWordIntro } from "@/lib/llm/deepseek";
import { canSendChatMessage } from "@/lib/subscription/limits";

// GET /api/chat/[wordId] - 获取与单词的聊天历史
export async function GET(
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

  // 获取单词信息
  const { data: word, error: wordError } = await supabase
    .from("word_friends")
    .select("*")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (wordError || !word) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  // 获取聊天历史
  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(50);

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  // 标记消息为已读
  await supabase
    .from("chat_messages")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .eq("is_read", false);

  // 获取用户剩余聊天次数
  const today = new Date().toISOString().split("T")[0];
  const { count: todayCount } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", today);

  return NextResponse.json({
    word,
    messages: messages || [],
    usage: {
      todayCount: todayCount || 0,
      remaining: Math.max(0, 10 - (todayCount || 0)), // 默认免费版
    },
  });
}

// POST /api/chat/[wordId] - 发送消息给 AI 好友
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
  const body = await request.json();
  const { message, messageType = "text", generateIntro = false } = body;

  // 非自动介绍模式需要消息内容
  if (!generateIntro && !message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // 检查订阅限制 - 每日聊天次数（自动介绍模式不检查）
  if (!generateIntro) {
    const chatCheck = await canSendChatMessage(userId);
    if (!chatCheck.allowed) {
      return NextResponse.json(
        {
          error: chatCheck.reason,
          limitReached: true,
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }
  }

  // 获取单词信息
  const { data: word, error: wordError } = await supabase
    .from("word_friends")
    .select("*")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (wordError || !word) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  // 检查是否需要生成详细学习档案（第一次聊天时）
  const hasDetailedIntro = word.ai_self_intro &&
    (word.metadata?.detailedDefinitions || word.metadata?.etymology || word.metadata?.synonyms);

  if (!hasDetailedIntro) {
    console.log("第一次聊天，生成详细学习档案...");
    try {
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

      if (intro) {
        // 检查是否为 fallback 占位符数据
        const isFallback = intro.detailedDefinitions?.[0]?.definition?.includes("Click") ||
                           intro.detailedDefinitions?.[0]?.chinese?.includes("点击") ||
                           intro.etymology?.includes("点击") ||
                           intro.memoryTips?.[0]?.includes("点击");

        if (!isFallback) {
          // 更新数据库
          await supabase
            .from("word_friends")
            .update({
              metadata: {
                detailedDefinitions: intro.detailedDefinitions,
                synonyms: intro.synonyms,
                antonyms: intro.antonyms,
                similarWords: intro.similarWords,
                etymology: intro.etymology,
                memoryTips: intro.memoryTips,
              },
              ai_name: intro.aiName || null,
              ai_self_intro: intro.selfIntro || null,
              ai_conversation_style: intro.conversationStyle || null,
            })
            .eq("id", wordId);

          // 更新word对象
          word.metadata = {
            detailedDefinitions: intro.detailedDefinitions,
            synonyms: intro.synonyms,
            antonyms: intro.antonyms,
            similarWords: intro.similarWords,
            etymology: intro.etymology,
            memoryTips: intro.memoryTips,
          };
          word.ai_name = intro.aiName;
          word.ai_self_intro = intro.selfIntro;
          word.ai_conversation_style = intro.conversationStyle;
        }
      }
    } catch (error) {
      console.error("生成学习档案失败，继续聊天:", error);
    }
  }

  // 保存用户消息（自动介绍模式不保存用户消息）
  let userMessage = null;
  if (!generateIntro) {
    const result = await supabase
      .from("chat_messages")
      .insert({
        user_id: userId,
        word_id: wordId,
        sender: "user",
        message_type: messageType,
        content: message,
      })
      .select()
      .single();

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    userMessage = result.data;
  }

  // 获取最近的聊天历史作为上下文
  const { data: recentMessages } = await supabase
    .from("chat_messages")
    .select("sender, content")
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const chatHistory = (recentMessages || []).reverse();

  try {
    // 调用 AI 生成回复
    const aiReply = await chatWithWord(generateIntro ? "你好，请做一个详细的自我介绍，包含你的含义、记忆技巧、近义词、反义词和词源等信息" : message, {
      word: word.word,
      wordInfo: {
        definitions: word.definitions as any,
        aiName: word.ai_name || undefined,
        personalityType: word.ai_conversation_style || "friendly",
        // 传递详细的学习档案信息
        metadata: word.metadata,
        aiSelfIntro: word.ai_self_intro,
      },
      chatHistory: generateIntro ? [] : chatHistory.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.content,
      })),
    });

    // 保存 AI 回复
    const { data: aiMessage, error: aiMsgError } = await supabase
      .from("chat_messages")
      .insert({
        user_id: userId,
        word_id: wordId,
        sender: "ai",
        message_type: "text",
        content: aiReply,
        ai_model_used: "glm-4-plus",
      })
      .select()
      .single();

    if (aiMsgError) {
      console.error("Failed to save AI message:", aiMsgError);
    }

    return NextResponse.json({
      userMessage,
      aiMessage: aiMessage || { content: aiReply },
    });
  } catch (error) {
    console.error("Error generating AI reply:", error);

    // 使用后备回复
    const fallbackReply = `作为 ${word.word}，我很高兴和你聊天！你想了解更多关于我的用法吗？`;

    const { data: aiMessage } = await supabase
      .from("chat_messages")
      .insert({
        user_id: userId,
        word_id: wordId,
        sender: "ai",
        message_type: "text",
        content: fallbackReply,
      })
      .select()
      .single();

    return NextResponse.json({
      userMessage,
      aiMessage,
    });
  }
}
