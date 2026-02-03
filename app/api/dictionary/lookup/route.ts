import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/dictionary/lookup?word=xxx - 查询单词详细信息
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get("word");

  if (!word) {
    return NextResponse.json({ error: "word is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  // 优先从用户的 word_friends 查找
  let wordInfo: any = null;

  if (userId) {
    const { data: userWord } = await supabase
      .from("word_friends")
      .select("*")
      .eq("user_id", userId)
      .ilike("word", word)
      .single();

    if (userWord && !userWord.error) {
      wordInfo = userWord;
    }
  }

  // 如果用户词库没有，从公共词典查找
  if (!wordInfo) {
    const { data: dictWord } = await supabase
      .from("word_dictionary")
      .select("*")
      .ilike("word", word)
      .single();

    if (dictWord && !dictWord.error) {
      wordInfo = dictWord;
    }
  }

  // 如果都没有，使用免费在线词典 API
  if (!wordInfo) {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      );

      if (response.ok) {
        const dictData = await response.json();
        const entry = dictData?.[0];

        if (entry) {
          const phonetics = entry.phonetics || [];
          const phonetic = phonetics.find((p: any) => p.text)?.text || entry.phonetic || "";
          const audio = phonetics.find((p: any) => p.audio)?.audio || "";

          const meanings = entry.meanings || [];
          const firstMeaning = meanings[0];
          const englishDefinition = firstMeaning?.definitions?.[0]?.definition || "";

          // 使用智谱翻译中文释义
          const chineseDefinition = await translateToChinese(word, englishDefinition);

          wordInfo = {
            word: entry.word,
            pronunciation: phonetic,
            audio_url: audio,
            part_of_speech: firstMeaning?.partOfSpeech || "",
            definitions: meanings.slice(0, 3).map((m: any) => ({
              partOfSpeech: m.partOfSpeech,
              definition: m.definitions?.[0]?.definition || "",
              example: m.definitions?.[0]?.example || "",
              chinese: chineseDefinition,
            })),
          };
        }
      }
    } catch (error) {
      console.error("Dictionary API error:", error);
    }
  }

  if (!wordInfo) {
    return NextResponse.json({
      word,
      found: false,
      pronunciation: "",
      partOfSpeech: "",
      definition: "",
      example: "",
      definitions: [],
    });
  }

  // 格式化返回数据
  const definitions = wordInfo.definitions || [];
  const pronunciation = wordInfo.pronunciation || "";
  const partOfSpeech = wordInfo.part_of_speech || definitions?.[0]?.partOfSpeech || "";

  // 提取第一个释义和例句
  let firstDefinition = "";
  let firstExample = "";
  let chineseDefinition = "";

  if (definitions.length > 0) {
    const def = definitions[0];
    if (typeof def === "object") {
      firstDefinition = def.definition || "";
      firstExample = def.example || "";
      chineseDefinition = def.chinese || "";
    }
  }

  return NextResponse.json({
    word: wordInfo.word,
    found: true,
    pronunciation,
    audio_url: wordInfo.audio_url || "",
    partOfSpeech,
    definition: firstDefinition,
    chinese: chineseDefinition,
    example: firstExample,
    definitions: definitions.slice(0, 3),
  });
}

// 使用智谱 API 翻译为中文
async function translateToChinese(word: string, englishDefinition: string): Promise<string> {
  if (!process.env.ZHIPU_API_KEY || !englishDefinition) {
    return "";
  }

  try {
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          {
            role: "system",
            content: "你是一个专业的英语翻译助手，请将英文单词释义翻译成简洁准确的中文。只返回中文翻译，不要解释。",
          },
          {
            role: "user",
            content: `单词 "${word}" 的英文释义是：${englishDefinition}\n\n请翻译成中文（简洁版，不超过15个字）：`,
          },
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const translation = data.choices?.[0]?.message?.content?.trim();
      return translation || "";
    }
  } catch (error) {
    console.error("Translation error:", error);
  }

  return "";
}
