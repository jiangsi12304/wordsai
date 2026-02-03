import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/whitelist/submit - 提交白名单训练答案
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { wordId, questionId, answer, stage, correctAnswer: providedCorrectAnswer } = body;

  if (!wordId || !questionId || answer === undefined) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

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

  // 判断答案是否正确
  let isCorrect = false;
  let feedback = "";
  let correctAnswer = "";

  if (stage === 3 || questionId.startsWith("output")) {
    // 主动输出题，给正面反馈
    isCorrect = true;
    feedback = generatePositiveFeedback(word.word, answer);
  } else if (providedCorrectAnswer) {
    // 使用 AI 提供的正确答案
    correctAnswer = providedCorrectAnswer;
    isCorrect = String(answer).trim() === String(providedCorrectAnswer).trim();
    feedback = isCorrect
      ? "回答正确！太棒了！🎉"
      : `正确答案是: ${providedCorrectAnswer}`;
  } else if (questionId === "listening-2" || questionId === "choice-2" || questionId === "q2") {
    // 词义选择题 - 需要比较释义
    const meaning = getWordMeaning(word);
    correctAnswer = meaning;
    isCorrect = String(answer).trim() === meaning.trim();
    feedback = isCorrect
      ? "回答正确！太棒了！"
      : `正确答案是: ${meaning}`;
  } else {
    // 单词拼写/听写题 - 直接比对单词
    correctAnswer = word.word;
    isCorrect = String(answer).toLowerCase().trim() === String(word.word).toLowerCase().trim();
    feedback = isCorrect
      ? "回答正确！太棒了！"
      : `正确答案是: ${word.word}`;
  }

  // 更新白名单训练记录
  const { error: updateError } = await supabase
    .from("whitelist_words")
    .update({
      practice_count: (word as any).practice_count
        ? (word as any).practice_count + 1
        : 1,
      last_practiced_at: new Date().toISOString(),
    })
    .eq("word_id", wordId)
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to update whitelist record:", updateError);
  }

  return NextResponse.json({
    isCorrect,
    feedback,
    nextStage: stage && stage < 3 ? stage + 1 : null,
  });
}

// 生成正面反馈
function generatePositiveFeedback(word: string, answer: string): string {
  const feedbacks = [
    `很好的句子！"${answer}" 很好地运用了 "${word}"。`,
    `"${answer}" 表达很自然！继续加油！`,
    `"${answer}" 用得恰到好处！你对 "${word}" 的掌握越来越好了。`,
    `很棒！这个句子很有创意！`,
  ];
  return feedbacks[Math.floor(Math.random() * feedbacks.length)];
}

// 获取单词的中文释义
function getWordMeaning(word: any): string {
  const definitions = word.definitions || [];
  const metadata = word.metadata || {};

  // 优先从 metadata 中获取详细释义
  if (metadata.detailedDefinitions && metadata.detailedDefinitions.length > 0) {
    const firstDef = metadata.detailedDefinitions[0];
    if (firstDef.chinese) {
      return firstDef.chinese;
    }
  }

  // 从 definitions 字段获取
  if (Array.isArray(definitions) && definitions.length > 0) {
    const firstDef = definitions[0];
    if (typeof firstDef === "object") {
      return firstDef.chinese || firstDef.definition || "能够的；有能力的";
    }
    return firstDef || "能够的；有能力的";
  }

  // 使用 fallback 词库获取释义
  return getFallbackMeaning(word.word);
}

// 获取单词的中文释义（使用简单词库）
function getSimpleMeaning(word: string): string {
  const commonWords: Record<string, string> = {
    "able": "能够的；有能力的",
    "happy": "快乐的；幸福的",
    "sad": "悲伤的；难过的",
    "big": "大的；巨大的",
    "small": "小的；微小的",
    "good": "好的；优秀的",
    "bad": "坏的；糟糕的",
    "fast": "快的；迅速的",
    "slow": "慢的；缓慢的",
    "new": "新的；新鲜的",
    "old": "旧的；老年的",
    "love": "爱；喜爱",
    "hate": "讨厌；憎恨",
    "like": "喜欢",
    "dislike": "不喜欢",
    "hope": "希望；期待",
    "wish": "希望；愿望",
    "fear": "恐惧；害怕",
    "angry": "生气的；愤怒的",
    "calm": "平静的；冷静的",
    "excited": "兴奋的",
    "tired": "累的；疲劳的",
    "hungry": "饥饿的",
    "thirsty": "口渴的",
    "beautiful": "美丽的；漂亮的",
    "ugly": "丑陋的",
    "smart": "聪明的；智能的",
    "stupid": "愚蠢的；笨的",
    "kind": "善良的；友好的",
    "mean": "刻薄的；吝啬的",
    "brave": "勇敢的",
    "shy": "害羞的；胆小的",
    "strong": "强壮的；坚强的",
    "weak": "弱的；虚弱的",
    "rich": "富有的",
    "poor": "贫穷的",
    "hot": "热的；辣的",
    "cold": "冷的；寒冷的",
    "warm": "温暖的",
    "cool": "凉爽的；酷的",
    "important": "重要的",
    "easy": "容易的；简单的",
    "hard": "困难的；坚硬的",
    "simple": "简单的",
    "complex": "复杂的",
    "clean": "干净的；清洁的",
    "dirty": "脏的",
  };

  return commonWords[word.toLowerCase()] || "（请在单词详情页重新生成释义）";
}

// 使用 AI 获取单词释义
function getFallbackMeaning(word: string): string {
  const simple = getSimpleMeaning(word);
  if (simple) return simple;
  return "能够的；有能力的"; // 默认 fallback
}
