import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/words/[wordId] - 获取单个单词详情
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

  const { data: word, error: wordError } = await supabase
    .from("word_friends")
    .select("*")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (wordError || !word) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  return NextResponse.json({ word });
}

// PUT /api/words/[wordId] - 更新单词
export async function PUT(
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

  const { data: word, error: updateError } = await supabase
    .from("word_friends")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wordId)
    .eq("user_id", userId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ word });
}

// DELETE /api/words/[wordId] - 删除单词
export async function DELETE(
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
