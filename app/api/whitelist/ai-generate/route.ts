import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/whitelist/ai-generate - 使用 AI 生成训练题目
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { wordId, stage = 1 } = body;

  if (!wordId) {
    return NextResponse.json({ error: "wordId is required" }, { status: 400 });
  }

  try {
    // 获取目标单词信息
    const { data: targetWord } = await supabase
      .from("word_friends")
      .select("*")
      .eq("id", wordId)
      .eq("user_id", userId)
      .single();

    if (!targetWord) {
      return NextResponse.json({ error: "Word not found" }, { status: 404 });
    }

    // 获取用户词库（用于生成干扰项）
    const { data: userVocabulary } = await supabase
      .from("word_friends")
      .select("word, pronunciation, definitions, part_of_speech")
      .eq("user_id", userId)
      .neq("id", wordId)
      .limit(50);

    // 使用 AI 生成题目
    const questions = await generateAIQuestions(targetWord, userVocabulary || [], stage);

    return NextResponse.json({
      word: targetWord.word,
      stage,
      questions,
    });
  } catch (error: any) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate questions" },
      { status: 500 }
    );
  }
}

// 使用 AI 生成题目
async function generateAIQuestions(
  targetWord: any,
  userVocabulary: any[],
  stage: number
): Promise<any[]> {
  if (!process.env.ZHIPU_API_KEY) {
    // Fallback to simple questions if no API key
    return generateFallbackQuestions(targetWord, userVocabulary, stage);
  }

  const wordStr = targetWord.word;
  const meaning = extractMeaning(targetWord);

  // 构建词库信息供 AI 参考
  const vocabularyInfo = userVocabulary
    .slice(0, 20)
    .map((v) => `${v.word} (${extractMeaning(v)})`)
    .join("; ");

  const prompt = buildAIPrompt(wordStr, meaning, stage, vocabularyInfo);

  try {
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: "glm-4-plus",
        messages: [
          {
            role: "system",
            content: "你是一个专业的英语教学助手，擅长设计单词练习题目。请严格按照 JSON 格式输出题目。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      console.error("Zhipu API error:", response.status);
      return generateFallbackQuestions(targetWord, userVocabulary, stage);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return generateFallbackQuestions(targetWord, userVocabulary, stage);
    }

    return parseAIResponse(content, wordStr, meaning);
  } catch (error) {
    console.error("AI generation failed:", error);
    return generateFallbackQuestions(targetWord, userVocabulary, stage);
  }
}

// 构建 AI 提示词
function buildAIPrompt(
  word: string,
  meaning: string,
  stage: number,
  vocabularyInfo: string
): string {
  const stageConfigs = {
    1: "听力速记 - 听音辨词、词义选择",
    2: "完形填空 - 句子填空、选择正确单词",
    3: "主动输出 - 造句练习",
  };

  const config = stageConfigs[stage as keyof typeof stageConfigs] || stageConfigs[1];

  return `请为英语单词 "${word}"（含义：${meaning}）设计${config}题目。

要求：
1. 生成 2 道题目
2. 题目要有一定挑战性
3. 干扰选项要合理，不能一眼看出答案

${vocabularyInfo ? `用户已学词汇（可用于干扰项）：${vocabularyInfo}` : ""}

请严格按照以下 JSON 格式输出（不要有任何其他文字）：

\`\`\`json
{
  "questions": [
    {
      "id": "q1",
      "type": "listening",
      "question": "听音频，选择正确的单词",
      "audioUrl": "https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}",
      "options": [
        {"text": "${word}", "correct": true},
        {"text": "干扰词1", "correct": false},
        {"text": "干扰词2", "correct": false},
        {"text": "干扰词3", "correct": false}
      ],
      "correctAnswer": "${word}"
    },
    {
      "id": "q2",
      "type": "choice",
      "question": "\\"${word}\\" 的意思是？",
      "options": [
        {"text": "${meaning}", "correct": true},
        {"text": "错误释义1", "correct": false},
        {"text": "错误释义2", "correct": false},
        {"text": "错误释义3", "correct": false}
      ],
      "correctAnswer": "${meaning}"
    }
  ]
}
\`\`\`

注意事项：
- type 可以是: "listening"（听力）, "choice"（选择题）, "fillblanks"（填空）, "output"（造句）
- 词义要准确，干扰选项要接近但不正确
- 只输出 JSON，不要其他说明文字`;
}

// 解析 AI 响应
function parseAIResponse(content: string, word: string, meaning: string): any[] {
  try {
    // 提取 JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                     content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return generateFallbackQuestions({ word }, [], 1);
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions;
    }

    return generateFallbackQuestions({ word }, [], 1);
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return generateFallbackQuestions({ word }, [], 1);
  }
}

// 提取单词释义
function extractMeaning(word: any): string {
  // 优先从 metadata 获取
  if (word.metadata?.detailedDefinitions?.[0]?.chinese) {
    return word.metadata.detailedDefinitions[0].chinese;
  }

  // 从 definitions 获取
  if (word.definitions?.length > 0) {
    const def = word.definitions[0];
    if (typeof def === "object") {
      return def.chinese || def.definition || word.word;
    }
    return def;
  }

  // 使用简单词库
  return getSimpleMeaning(word.word);
}

// 简单词库
function getSimpleMeaning(word: string): string {
  const common: Record<string, string> = {
    able: "能够的；有能力的",
    happy: "快乐的；幸福的",
    sad: "悲伤的；难过的",
    good: "好的；优秀的",
    bad: "坏的；糟糕的",
    big: "大的；巨大的",
    small: "小的；微小的",
    love: "爱；喜爱",
    hope: "希望；期待",
    fear: "恐惧；害怕",
    calm: "平静的；冷静的",
    angry: "生气的；愤怒的",
  };
  return common[word.toLowerCase()] || "（请重新生成获取释义）";
}

// Fallback 题目生成
function generateFallbackQuestions(targetWord: any, userVocabulary: any[], stage: number): any[] {
  const word = targetWord.word;
  const meaning = extractMeaning(targetWord);

  // 从用户词库选择干扰词
  const distractors = userVocabulary
    .slice(0, 10)
    .map((v) => v.word)
    .filter((w) => w.toLowerCase() !== word.toLowerCase());

  // 确保有足够的干扰词
  while (distractors.length < 3) {
    distractors.push(generateRandomWord());
  }

  const shuffledDistractors = shuffleArray(distractors.slice(0, 3));

  const questions: any[] = [];

  // 阶段 1: 听力 + 词义
  if (stage === 1) {
    questions.push(
      {
        id: "listening-1",
        type: "listening",
        question: "听音频，选择正确的单词",
        audioUrl: `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`,
        options: shuffleArray([
          { text: word, correct: true },
          { text: shuffledDistractors[0], correct: false },
          { text: shuffledDistractors[1], correct: false },
          { text: shuffledDistractors[2], correct: false },
        ]),
        correctAnswer: word,
      },
      {
        id: "choice-1",
        type: "choice",
        question: `"${word}" 的意思是？`,
        options: shuffleArray([
          { text: meaning, correct: true },
          { text: getRandomMeaning(), correct: false },
          { text: getRandomMeaning(), correct: false },
          { text: getRandomMeaning(), correct: false },
        ]),
        correctAnswer: meaning,
      }
    );
  }

  // 阶段 2: 填空
  if (stage === 2) {
    questions.push({
      id: "fillblanks-1",
      type: "fillblanks",
      question: "选择正确的单词填空",
      sentence: `I am _____ to finish this task on time.`,
      options: shuffleArray([
        { text: word, correct: true },
        { text: shuffledDistractors[0], correct: false },
        { text: shuffledDistractors[1], correct: false },
        { text: shuffledDistractors[2], correct: false },
      ]),
      correctAnswer: word,
    });
  }

  // 阶段 3: 造句
  if (stage === 3) {
    questions.push({
      id: "output-1",
      type: "output",
      question: `请用 "${word}" 造一个句子`,
      topics: ["日常", "工作", "学习", "旅行"],
      aiEvaluate: true,
    });
  }

  return questions;
}

// 生成随机干扰词
function generateRandomWord(): string {
  const words = ["table", "chair", "house", "water", "food", "music", "book", "phone"];
  return words[Math.floor(Math.random() * words.length)];
}

// 随机错误释义
function getRandomMeaning(): string {
  const meanings = ["快乐", "悲伤", "愤怒", "平静", "期待", "厌恶", "恐惧", "惊讶"];
  return meanings[Math.floor(Math.random() * meanings.length)];
}

// 打乱数组
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
