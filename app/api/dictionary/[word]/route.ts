import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/dictionary/[word] - 获取单词完整字典信息（含AI增强内容）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ word: string }> }
) {
  const supabase = await createClient();
  const { word } = await params;

  // 从 word_dictionary 表获取基础数据
  const { data: dictData } = await supabase
    .from("word_dictionary")
    .select("*")
    .ilike("word", word)
    .single();

  // 如果没有找到，返回AI生成的内容
  if (!dictData) {
    // 尝试从外部API或AI生成
    return NextResponse.json({
      word,
      pronunciation: null,
      definitions: [],
      examples: [],
      synonyms: [],
      antonyms: [],
      similarWords: [],
      aiGenerated: true,
    });
  }

  return NextResponse.json({
    word: dictData.word,
    pronunciation: dictData.pronunciation,
    partOfSpeech: dictData.part_of_speech,
    definitions: dictData.definitions || [],
    examples: dictData.examples || [],
    etymology: dictData.etymology,
    frequencyRank: dictData.frequency_rank,
    difficulty: dictData.difficulty,
    // 额外字段（如果存在）
    synonyms: dictData.synonyms || [],
    antonyms: dictData.antonyms || [],
    similarWords: dictData.similar_words || [],
  });
}
