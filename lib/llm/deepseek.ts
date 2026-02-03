// DeepSeek API for generating word introductions and detailed word data
// Falls back to Free Dictionary API when no API key is available

export interface WordIntroContext {
  word: string;
  pronunciation?: string;
  definitions?: Array<{ partOfSpeech: string; definition: string; chinese?: string }>;
  examples?: string[];
  frequency?: string;
  difficulty?: number;
  userLevel?: "beginner" | "intermediate" | "advanced";
  personalityType?: "friendly" | "strict" | "humorous" | "encouraging";
}

export interface Synonym {
  word: string;
  pronunciation: string;
  definition: string;
}

export interface Antonym {
  word: string;
  pronunciation: string;
  definition: string;
}

export interface SimilarWord {
  word: string;
  pronunciation: string;
  difference: string;
}

export interface WordIntroResult {
  aiName: string;
  selfIntro: string;
  conversationStyle: string;
  detailedDefinitions: Array<{
    partOfSpeech: string;
    definition: string;
    chinese: string;
    example: string;
  }>;
  synonyms: Synonym[];
  antonyms: Antonym[];
  similarWords: SimilarWord[];
  etymology: string;
  memoryTips: string[];
}

/**
 * Generate word introduction using available AI APIs
 * Priority: ZHIPU > OPENROUTER > DEEPSEEK > Dictionary API > Fallback
 */
export async function generateWordIntro(
  context: WordIntroContext
): Promise<WordIntroResult | null> {
  const { word, personalityType = "friendly", userLevel = "beginner" } = context;

  // 优先使用智谱 API (用户已配置)
  if (process.env.ZHIPU_API_KEY) {
    try {
      const result = await generateWithZhipu(context, word, personalityType, userLevel);
      if (result) return result;
    } catch (error) {
      console.error("Zhipu API failed, trying next option:", error);
    }
  }

  // 使用 OpenRouter (DeepSeek R1)
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const result = await generateWithOpenRouter(context, word, personalityType, userLevel);
      if (result) return result;
    } catch (error) {
      console.error("OpenRouter API failed, trying next option:", error);
    }
  }

  // 使用 DeepSeek 官方 API
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const result = await generateWithDeepSeekDirect(context, word, personalityType, userLevel);
      if (result) return result;
    } catch (error) {
      console.error("DeepSeek API failed, trying dictionary API:", error);
    }
  }

  // 使用免费的 Free Dictionary API 获取基础数据
  try {
    return await getDictionaryData(word, personalityType);
  } catch (error) {
    console.error("Dictionary API failed, using fallback:", error);
    return getFallbackIntro(word, personalityType);
  }
}

/**
 * Use DeepSeek Direct API to generate comprehensive word data
 */
async function generateWithDeepSeekDirect(
  context: WordIntroContext,
  word: string,
  personalityType: string,
  userLevel: string
): Promise<WordIntroResult | null> {
  const systemPrompt = buildSystemPrompt(word, personalityType, userLevel);
  const userPrompt = buildUserPrompt(context);

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    console.error("DeepSeek API error:", response.status, response.statusText);
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return null;
  }

  return parseIntroResponse(content, word, personalityType);
}

/**
 * Use OpenRouter API (DeepSeek R1) to generate comprehensive word data
 */
async function generateWithOpenRouter(
  context: WordIntroContext,
  word: string,
  personalityType: string,
  userLevel: string
): Promise<WordIntroResult | null> {
  const systemPrompt = buildSystemPrompt(word, personalityType, userLevel);
  const userPrompt = buildUserPrompt(context);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    console.error("OpenRouter API error:", response.status, response.statusText);
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return null;
  }

  return parseIntroResponse(content, word, personalityType);
}

/**
 * Use Zhipu GLM-4 API to generate comprehensive word data
 */
async function generateWithZhipu(
  context: WordIntroContext,
  word: string,
  personalityType: string,
  userLevel: string
): Promise<WordIntroResult | null> {
  const systemPrompt = buildSystemPrompt(word, personalityType, userLevel);
  const userPrompt = buildUserPrompt(context);

  // 智谱 API 使用 JWT token，这里直接用 API key
  const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model: "glm-4-plus",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Zhipu API error:", response.status, errorText);
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    console.error("Zhipu API returned no content");
    return null;
  }

  return parseIntroResponse(content, word, personalityType);
}

/**
 * Use Free Dictionary API to get basic word data
 */
async function getDictionaryData(
  word: string,
  personalityType: string
): Promise<WordIntroResult> {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

  if (!response.ok) {
    throw new Error(`Dictionary API error: ${response.status}`);
  }

  const data = await response.json();
  const entry = data?.[0];

  if (!entry) {
    return getFallbackIntro(word, personalityType);
  }

  const personalities = {
    friendly: `${word}宝`,
    strict: `${word}老师`,
    humorous: `搞笑${word}`,
    encouraging: `${word}队长`,
  };
  const aiName = personalities[personalityType as keyof typeof personalities] || `${word}宝`;

  // 提取释义和例句
  const detailedDefinitions: Array<{
    partOfSpeech: string;
    definition: string;
    chinese: string;
    example: string;
  }> = [];

  entry.meanings?.forEach((meaning: any) => {
    meaning.definitions?.slice(0, 2).forEach((def: any) => {
      detailedDefinitions.push({
        partOfSpeech: meaning.partOfSpeech || "unknown",
        definition: def.definition || "",
        chinese: "", // 免费API不提供中文，需要翻译
        example: def.example || "",
      });
    });
  });

  // 构建发音
  const phonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || "";
  const audioUrl = entry.phonetics?.find((p: any) => p.audio)?.text || "";

  // 提取词源
  const etymology = entry.etymologies?.[0] || `词根词缀分析：${word} 的词源信息待补充`;

  // 生成记忆技巧
  const memoryTips = generateMemoryTips(word, detailedDefinitions);

  return {
    aiName,
    selfIntro: generateSelfIntro(word, detailedDefinitions[0]?.definition || ""),
    conversationStyle: "友好活泼，喜欢用表情符号",
    detailedDefinitions,
    synonyms: [], // 可以从 entry.meanings[x].synonyms 获取
    antonyms: [],
    similarWords: [],
    etymology,
    memoryTips,
  };
}

/**
 * Generate memory tips based on word structure
 */
function generateMemoryTips(word: string, definitions: any[]): string[] {
  const tips: string[] = [];
  const definition = definitions[0]?.definition || "";

  // 1. 词根词缀拆分
  const parts = splitWordParts(word);
  if (parts.length > 1) {
    tips.push(`词根记忆法：${word} = ${parts.join(" + ")}`);
  } else {
    tips.push(`把 ${word} 拆分成更容易记忆的部分进行记忆`);
  }

  // 2. 联想记忆
  tips.push(`联想记忆法：${word} 可以联想到 "${definition.substring(0, 50)}..."`);

  // 3. 语境记忆
  if (definitions[0]?.example) {
    tips.push(`语境记忆：通过例句 "${definitions[0].example}" 来记忆`);
  } else {
    tips.push(`多读多写，在不同语境中运用 ${word}`);
  }

  return tips;
}

/**
 * Try to split word into meaningful parts (prefix, root, suffix)
 */
function splitWordParts(word: string): string[] {
  const parts: string[] = [];
  const prefixes = ["un", "re", "in", "im", "dis", "pre", "mis", "over", "under", "anti"];
  const suffixes = ["ing", "ed", "tion", "sion", "ness", "ment", "able", "ible", "ful", "less", "ly", "er", "or"];

  let remaining = word.toLowerCase();

  // Check for prefix
  for (const prefix of prefixes) {
    if (remaining.startsWith(prefix) && remaining.length > prefix.length + 2) {
      parts.push(prefix);
      remaining = remaining.slice(prefix.length);
      break;
    }
  }

  // Check for suffix
  for (const suffix of suffixes) {
    if (remaining.endsWith(suffix) && remaining.length > suffix.length + 2) {
      parts.push(remaining.slice(0, -suffix.length));
      parts.push(suffix);
      return parts;
    }
  }

  if (parts.length === 0) {
    return [word];
  }

  parts.push(remaining);
  return parts;
}

/**
 * Generate a friendly self-introduction for the word
 */
function generateSelfIntro(word: string, definition: string): string {
  const intros = [
    `嗨！我是 "${word}"，我${definition ? `的意思是 "${definition.substring(0, 30)}..."` : "是一个很有用的单词"}，很高兴认识你！`,
    `你好呀！我是 ${word}，${definition ? `记住我的意思是 "${definition.substring(0, 20)}..." 吧～` : "让我们一起成为好朋友！"}`,
    `嘿！我是 ${word}，${definition ? `我在英语中很常用，意思是 "${definition.substring(0, 25)}..."` : "让我来帮助你丰富你的词汇量！"}`,
  ];
  return intros[Math.floor(Math.random() * intros.length)];
}

function buildSystemPrompt(
  word: string,
  personalityType: string,
  userLevel: string
): string {
  const personalities = {
    friendly: "你是一个超级友好的英语单词小助手，说话温柔可爱，善于鼓励学习者。",
    strict: "你是一个严谨的英语老师，注重准确性，解释清晰专业。",
    humorous: "你是一个幽默风趣的单词讲师，用有趣的比喻帮助记忆。",
    encouraging: "你是一个积极向上的学习伙伴，总是给用户加油打气。",
  };

  const levelInstructions = {
    beginner: "用简单易懂的中文解释，避免过于复杂的术语。",
    intermediate: "可以用一些中级词汇和表达，适当使用英文解释。",
    advanced: "可以使用专业的语言学术语和深入的语言学分析。",
  };

  return `你是一个专业的英语单词教学 AI 助手，专门为单词 "${word}" 创建详细的学习档案。

## 你的性格特点
${personalities[personalityType as keyof typeof personalities] || personalities.friendly}

## 针对的学习者水平
${levelInstructions[userLevel as keyof typeof levelInstructions] || levelInstructions.beginner}

## 你的任务
1. 分析单词 "${word}" 的含义、用法、词源
2. 提供准确的释义和地道的例句
3. 找出相关的近义词、反义词、形近词
4. 分析词根词缀，帮助用户理解单词构成
5. 提供实用的记忆技巧

## 输出要求
- 确保所有信息真实准确，不要编造不存在的词汇
- 如果某些信息不确定，宁可留空也不要提供错误信息
- 记忆技巧要具体实用，针对该单词的特点`;
}

function buildUserPrompt(context: WordIntroContext): string {
  const { word, pronunciation, definitions, examples, frequency, difficulty } = context;

  let prompt = `请为英语单词 "${word}" 生成一份详细的学习档案数据。

你是一个专业的英语教学 AI 助手，需要提供准确、实用的单词学习内容。

`;

  if (pronunciation) {
    prompt += `已知信息：
- 发音：${pronunciation}\n`;
  }
  if (definitions && definitions.length > 0) {
    prompt += `- 释义：${definitions.map(d => d.definition).join("; ")}\n`;
  }
  if (examples && examples.length > 0) {
    prompt += `- 例句：${examples.slice(0, 2).join("; ")}\n`;
  }
  if (frequency) {
    prompt += `- 词频：${frequency}\n`;
  }
  if (difficulty) {
    prompt += `- 难度：${difficulty}/5\n`;
  }

  prompt += `
请严格按照以下 JSON 格式返回数据（注意：所有内容必须真实准确，不要编造）：

\`\`\`json
{
  "aiName": "给这个单词起的可爱拟人化名字（如：${word}小助手、${word}宝等）",
  "selfIntro": "以单词第一人称的自我介绍，生动有趣地说明自己的含义和用法（2-3句话）",
  "conversationStyle": "聊天风格的简短描述",
  "detailedDefinitions": [
    {
      "partOfSpeech": "词性（如 verb, noun, adjective）",
      "definition": "准确的英文释义",
      "chinese": "准确的中文释义",
      "example": "地道的英文例句"
    }
  ],
  "synonyms": [
    {"word": "近义词1", "pronunciation": "音标", "definition": "简要说明用法区别"}
  ],
  "antonyms": [
    {"word": "反义词1", "pronunciation": "音标", "definition": "简要说明"}
  ],
  "similarWords": [
    {"word": "形近词", "pronunciation": "音标", "difference": "拼写相似但含义不同的说明"}
  ],
  "etymology": "词根词缀分析，说明单词构成（如 un- + believe + -able）",
  "memoryTips": [
    "具体的记忆技巧1（如拆分记忆、联想记忆、谐音记忆等）",
    "具体的记忆技巧2",
    "具体的记忆技巧3"
  ]
}
\`\`\`

注意事项：
1. 释义和例句必须准确，如果是常见词请提供真实内容
2. 近义词、反义词、形近词如果不知道可以留空数组 []
3. 记忆技巧要具体实用，不要空泛
4. 只返回 JSON，不要其他说明文字`;

  return prompt;
}

function parseIntroResponse(
  content: string,
  word: string,
  personalityType: string
): WordIntroResult | null {
  try {
    // 尝试提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getFallbackIntro(word, personalityType);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as WordIntroResult;
  } catch (error) {
    console.error("Error parsing intro response:", error);
    return getFallbackIntro(word, personalityType);
  }
}

function getFallbackIntro(word: string, personalityType: string): WordIntroResult {
  const personalities = {
    friendly: `${word}小助手`,
    strict: `${word}老师`,
    humorous: `搞笑${word}`,
    encouraging: `${word}队长`,
  };

  const aiName = personalities[personalityType as keyof typeof personalities] || `${word}小助手`;

  // 分析词性（简单判断）
  let guessedPos = "unknown";
  if (word.endsWith("ing") || word.endsWith("ed")) guessedPos = "verb";
  else if (word.endsWith("tion") || word.endsWith("sion") || word.endsWith("ment")) guessedPos = "noun";
  else if (word.endsWith("able") || word.endsWith("ful") || word.endsWith("ive")) guessedPos = "adjective";
  else if (word.endsWith("ly")) guessedPos = "adverb";

  // 分析词根词缀
  const analysis = analyzeWordStructure(word);

  return {
    aiName,
    selfIntro: `嗨！我是单词 "${word}"，很高兴认识你！让我来帮你了解我的含义和用法～`,
    conversationStyle: "友好活泼，耐心解答",
    detailedDefinitions: [
      {
        partOfSpeech: guessedPos,
        definition: `Click "重新生成" to get detailed definition for "${word}"`,
        chinese: "点击重新生成获取详细释义",
        example: `Example will be generated after clicking "重新生成"`,
      },
    ],
    synonyms: [],
    antonyms: [],
    similarWords: [],
    etymology: analysis,
    memoryTips: [
      `点击重新生成按钮，AI 将为 "${word}" 生成详细记忆技巧`,
      `尝试将 "${word}" 放入句子中记忆`,
      `反复朗读 "${word}" 加强记忆`,
    ],
  };
}

/**
 * Simple word structure analysis for fallback
 */
function analyzeWordStructure(word: string): string {
  const prefixes: Record<string, string> = {
    "un": "不（否定前缀）",
    "re": "再次（重复前缀）",
    "pre": "之前（时间前缀）",
    "post": "之后（时间后缀）",
    "dis": "分开（否定前缀）",
    "mis": "错误（否定前缀）",
    "in": "不/进入（前缀）",
    "im": "不/进入（前缀，变体）",
    "over": "过度（前缀）",
    "under": "不足（前缀）",
  };

  const suffixes: Record<string, string> = {
    "ing": "进行中（现在分词后缀）",
    "ed": "已完成（过去式/过去分词后缀）",
    "tion": "名词后缀（表示状态或动作）",
    "sion": "名词后缀（表示状态或动作）",
    "ment": "名词后缀（表示结果或手段）",
    "ness": "名词后缀（表示性质或状态）",
    "able": "形容词后缀（能够...的）",
    "ible": "形容词后缀（能够...的）",
    "ful": "形容词后缀（充满...的）",
    "less": "形容词后缀（缺乏...的）",
    "ive": "形容词后缀（具有...性质的）",
    "ly": "副词后缀",
    "er": "名词后缀（人或物）",
    "or": "名词后缀（人或物）",
  };

  const lower = word.toLowerCase();

  for (const [prefix, meaning] of Object.entries(prefixes)) {
    if (lower.startsWith(prefix) && lower.length > prefix.length + 2) {
      return `包含前缀 "${prefix}"（${meaning}），点击"重新生成"获取完整词源分析`;
    }
  }

  for (const [suffix, meaning] of Object.entries(suffixes)) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) {
      return `包含后缀 "${suffix}"（${meaning}），点击"重新生成"获取完整词源分析`;
    }
  }

  return `词根词缀分析待完成，点击"重新生成"让 AI 帮你分析`;
}
