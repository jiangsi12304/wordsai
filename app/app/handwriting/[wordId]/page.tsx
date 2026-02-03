"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HandwritingBoard } from "@/components/handwriting/handwriting-board";
import { Loader2 } from "lucide-react";

export default function HandwritingPage() {
  const router = useRouter();
  const params = useParams();
  const wordId = params.wordId as string;

  const [word, setWord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWord();
  }, [wordId]);

  const fetchWord = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("word_friends")
        .select("*")
        .eq("id", wordId)
        .single();

      if (error) throw error;
      setWord(data);
    } catch (error) {
      console.error("Failed to fetch word:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (dataUrl: string) => {
    // TODO: 将手写图片保存到 storage 或发送到聊天
    // 这里暂时将图片发送到聊天
    try {
      const res = await fetch(`/api/chat/${wordId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "这是我的手写练习：",
          messageType: "image",
          imageUrl: dataUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to send handwriting");
    } catch (error) {
      console.error("Failed to save handwriting:", error);
    }

    // 返回聊天页面
    router.push(`/app/chat/${wordId}`);
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
      </div>
    );
  }

  if (!word) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-muted-foreground mb-4">单词不存在</p>
        <button onClick={handleCancel} className="text-primary hover:underline">
          返回
        </button>
      </div>
    );
  }

  return (
    <HandwritingBoard
      word={word.word}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
