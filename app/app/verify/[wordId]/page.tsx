"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VoiceVerifier } from "@/components/voice/voice-verifier";
import { SelfCheckModal } from "@/components/voice/self-check-modal";

export default function VerifyPage({ params }: { params: Promise<{ wordId: string }> }) {
  const { wordId } = use(params);
  const router = useRouter();
  const [word, setWord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSelfCheck, setShowSelfCheck] = useState(false);

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

  const handleBack = () => {
    router.back();
  };

  const handleVoicePass = () => {
    setShowSelfCheck(true);
  };

  const handleVoiceFail = () => {
    // 跳转到单词详情页
    router.push(`/app/word-detail/${wordId}`);
  };

  const handleSelfCheck = (knows: boolean) => {
    setShowSelfCheck(false);
    if (knows) {
      // 进入聊天
      router.push(`/app/chat/${wordId}`);
    } else {
      // 跳转到单词详情页，并标记需要生成详细内容
      router.push(`/app/word-detail/${wordId}?generate=true`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!word) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-muted-foreground mb-4">单词不存在</p>
        <button onClick={handleBack} className="text-primary hover:underline">
          返回
        </button>
      </div>
    );
  }

  return (
    <>
      <VoiceVerifier
        word={word.word}
        pronunciation={word.pronunciation}
        onPass={handleVoicePass}
        onFail={handleVoiceFail}
        onBack={handleBack}
      />
      <SelfCheckModal
        isOpen={showSelfCheck}
        word={word.word}
        onConfirm={handleSelfCheck}
      />
    </>
  );
}
