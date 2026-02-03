import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateWordIntro } from "@/lib/llm/deepseek";
import type { WordIntroContext } from "@/lib/llm/deepseek";

// POST /api/ai/intro - 生成单词自我介绍
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, word, ...context } = body;

  if (type === "intro") {
    // 生成单词自我介绍
    const intro = await generateWordIntro({
      word,
      ...context,
    } as WordIntroContext);

    if (!intro) {
      return NextResponse.json({ error: "Failed to generate intro" }, { status: 500 });
    }

    return NextResponse.json({ intro });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
