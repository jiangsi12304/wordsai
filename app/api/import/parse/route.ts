import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/import/parse - AI智能识别各种排版格式并提取单词
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content, filename } = await request.json();

    console.log("Import parse request:", { filename, contentLength: content?.length });

    if (!content || content.trim().length === 0) {
      return NextResponse.json({
        error: "文件内容为空，请检查文件是否有内容",
        words: [],
        debug: { filename, contentLength: content?.length }
      }, { status: 400 });
    }

    // 直接使用AI进行智能识别
    const result = await aiParseContent(content, filename);

    console.log("Parse result:", { count: result.count, format: result.format });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: error.message || "解析失败", words: [] },
      { status: 500 }
    );
  }
}

// 使用AI智能解析内容（支持备用API）
async function aiParseContent(
  content: string,
  filename?: string
): Promise<{ words: { word: string; chinese?: string; definition?: string }[]; count: number; format?: string }> {
  // 截断过长的内容（保留前3000字符供AI分析）
  const truncatedContent = content.length > 3000 ? content.slice(0, 3000) + "\n...(内容已截断)" : content;

  const prompt = `你是一个专业的英语单词提取助手。请分析以下文本内容，提取所有英语单词。

文件名：${filename || "未知"}

【原始内容】
\`\`\`
${truncatedContent}
\`\`\`

【任务要求】
1. 识别内容的排版格式（可能是：单词列表、带释义的列表、表格、句子、混合格式等）
2. 提取所有有效的英语单词（2个字母以上）
3. 如果内容中有中文释义，请一并提取
4. 忽略明显的缩写、专有名词（人名地名）等

【返回格式】
请只返回纯JSON，不要有其他文字：
\`\`\`json
{
  "format": "识别到的格式类型",
  "words": [
    {"word": "hello", "chinese": "你好"},
    {"word": "abandon", "chinese": "放弃，遗弃"},
    {"word": "ability", "chinese": "能力，才能"}
  ]
}
\`\`\`

【示例】
如果输入是：
hello - 你好
world 世界

输出应该是：
{"format": "单词-释义列表", "words": [{"word": "hello", "chinese": "你好"}, {"word": "world", "chinese": "世界"}]}`;

  const systemPrompt = "你是专业的英语学习助手，擅长从各种格式的文本中提取英语单词和释义。只返回JSON格式的结果，不要有任何额外说明。";

  // 优先使用智谱 GLM-4-Flash（更便宜更快）
  if (process.env.ZHIPU_API_KEY) {
    try {
      const result = await callZhipuAI(prompt, systemPrompt);
      if (result) return result;
      console.log("智谱API失败，尝试DeepSeek");
    } catch (error) {
      console.log("智谱API调用失败，尝试DeepSeek:", error);
    }
  }

  // DeepSeek作为备用
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const result = await callDeepSeekAI(prompt, systemPrompt);
      if (result) return result;
    } catch (error) {
      console.log("DeepSeek API调用失败:", error);
    }
  }

  // 所有AI都失败，降级到正则提取
  return fallbackParse(content);
}

// 调用智谱 GLM-4-Flash API
async function callZhipuAI(
  prompt: string,
  systemPrompt: string
): Promise<{ words: { word: string; chinese?: string; definition?: string }[]; count: number; format?: string } | null> {
  const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("智谱API error:", response.status, errorText);
    return null;
  }

  const data = await response.json();
  const aiContent = data.choices?.[0]?.message?.content;

  if (!aiContent) return null;

  return parseAIResponse(aiContent);
}

// 调用 DeepSeek API
async function callDeepSeekAI(
  prompt: string,
  systemPrompt: string
): Promise<{ words: { word: string; chinese?: string; definition?: string }[]; count: number; format?: string } | null> {
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
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("DeepSeek API error:", response.status, errorText);
    return null;
  }

  const data = await response.json();
  const aiContent = data.choices?.[0]?.message?.content;

  if (!aiContent) return null;

  return parseAIResponse(aiContent);
}

// 解析AI响应
function parseAIResponse(
  aiContent: string
): { words: { word: string; chinese?: string; definition?: string }[]; count: number; format?: string } | null {
  // 尝试多种方式提取JSON
  let parsed: { format?: string; words?: any[] } = {};

  // 方式1: 直接解析整个内容
  try {
    parsed = JSON.parse(aiContent.trim());
  } catch {
    // 方式2: 提取代码块中的JSON
    const codeBlockMatch = aiContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1].trim());
      } catch {}
    }

    // 方式3: 查找JSON对象
    if (!parsed.words) {
      const jsonMatch = aiContent.match(/\{[\s\S]*"words"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {}
      }
    }
  }

  // 验证并清理结果
  if (parsed.words && Array.isArray(parsed.words)) {
    const cleanedWords = parsed.words
      .filter((item: any) => item.word && typeof item.word === "string")
      .map((item: any) => ({
        word: item.word.toLowerCase().trim(),
        chinese: item.chinese || undefined,
        definition: item.definition || undefined,
      }))
      .filter((item: any) => /^[a-z]{2,}$/.test(item.word));

    // 去重
    const uniqueWords = Array.from(
      new Map(cleanedWords.map((w: any) => [w.word, w])).values()
    );

    return {
      words: uniqueWords,
      count: uniqueWords.length,
      format: parsed.format || "AI识别",
    };
  }

  return null;
}

// 降级方案：使用正则表达式简单提取
function fallbackParse(content: string): {
  words: { word: string; chinese?: string }[];
  count: number;
  format: string;
} {
  // 提取所有英文单词
  const wordMatches = content.match(/\b[a-zA-Z]{3,}\b/g) || [];

  const uniqueWords = Array.from(
    new Set(wordMatches.map((w) => w.toLowerCase()))
  )
    .filter((w) => /^[a-z]{2,}$/.test(w))
    .map((w) => ({ word: w }))
    .slice(0, 100); // 限制最多100个

  return {
    words: uniqueWords,
    count: uniqueWords.length,
    format: "简单提取",
  };
}
