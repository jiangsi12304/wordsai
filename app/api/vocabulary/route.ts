import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/vocabulary - 获取用户词库
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const partOfSpeech = searchParams.get("partOfSpeech");
  const minDifficulty = parseInt(searchParams.get("minDifficulty") || "1");
  const maxDifficulty = parseInt(searchParams.get("maxDifficulty") || "5");
  const excludeWordId = searchParams.get("excludeWordId");

  let query = supabase
    .from("word_friends")
    .select("id, word, pronunciation, part_of_speech, definitions, difficulty_score, mastery_level")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // 可选过滤条件
  if (partOfSpeech) {
    query = query.eq("part_of_speech", partOfSpeech);
  }

  if (minDifficulty && maxDifficulty) {
    query = query.gte("difficulty_score", minDifficulty).lte("difficulty_score", maxDifficulty);
  }

  // 排除指定单词（用于生成干扰项）
  if (excludeWordId) {
    query = query.neq("id", excludeWordId);
  }

  const { data: words, error: queryError } = await query;

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  // 获取总数
  const { count } = await supabase
    .from("word_friends")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return NextResponse.json({
    words: words || [],
    total: count || 0,
    limit,
    offset,
  });
}

// POST /api/vocabulary - 手动添加单词到词库
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { word, pronunciation, partOfSpeech, definitions, examples } = body;

  if (!word) {
    return NextResponse.json({ error: "word is required" }, { status: 400 });
  }

  // 检查是否已存在
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

  // 添加到词库
  const { data: newWord, error: insertError } = await supabase
    .from("word_friends")
    .insert({
      user_id: userId,
      word: word.trim().toLowerCase(),
      pronunciation: pronunciation || null,
      part_of_speech: partOfSpeech || null,
      definitions: definitions || [],
      difficulty_score: 1,
      next_review_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ word: newWord }, { status: 201 });
}

// DELETE /api/vocabulary?wordId=xxx - 从词库删除单词
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const { searchParams } = new URL(request.url);
  const wordId = searchParams.get("wordId");

  if (!wordId) {
    return NextResponse.json({ error: "wordId is required" }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("word_friends")
    .delete()
    .eq("id", wordId)
    .eq("user_id", userId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
