import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/whitelist - 获取白名单单词列表
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;

  const { data: words, error: wordsError } = await supabase
    .from("word_friends")
    .select("*")
    .eq("user_id", userId)
    .eq("is_in_whitelist", true)
    .order("created_at", { ascending: false });

  if (wordsError) {
    return NextResponse.json({ error: wordsError.message }, { status: 500 });
  }

  return NextResponse.json({ words });
}

// POST /api/whitelist - 添加单词到白名单
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { wordId } = body;

  if (!wordId) {
    return NextResponse.json(
      { error: "wordId is required" },
      { status: 400 }
    );
  }

  // 检查单词是否属于当前用户
  const { data: word } = await supabase
    .from("word_friends")
    .select("id, is_in_whitelist")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (!word) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  // 如果已经在白名单，直接返回成功（幂等操作）
  if (word.is_in_whitelist) {
    return NextResponse.json({ success: true, alreadyInWhitelist: true });
  }

  // 添加到白名单
  const { error: updateError } = await supabase
    .from("word_friends")
    .update({ is_in_whitelist: true })
    .eq("id", wordId)
    .eq("user_id", userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 创建白名单记录
  const { error: whitelistError } = await supabase
    .from("whitelist_words")
    .insert({
      user_id: userId,
      word_id: wordId,
    });

  if (whitelistError) {
    console.error("Failed to create whitelist record:", whitelistError);
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/whitelist?wordId=xxx - 从白名单移除单词
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
    return NextResponse.json(
      { error: "wordId is required" },
      { status: 400 }
    );
  }

  // 从白名单移除
  const { error: updateError } = await supabase
    .from("word_friends")
    .update({ is_in_whitelist: false })
    .eq("id", wordId)
    .eq("user_id", userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 删除白名单记录
  const { error: deleteError } = await supabase
    .from("whitelist_words")
    .delete()
    .eq("word_id", wordId)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Failed to delete whitelist record:", deleteError);
  }

  return NextResponse.json({ success: true });
}
