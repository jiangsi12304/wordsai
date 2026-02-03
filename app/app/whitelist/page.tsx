"use client";

import { useEffect, useState } from "react";
import { Star, Trophy, Loader2, Flame } from "lucide-react";
import { WordChatItem, type WordChatItemData } from "@/components/ui/swipeable-card";
import { useRouter } from "next/navigation";

export default function WhitelistPage() {
  const [words, setWords] = useState<WordChatItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchWhitelistWords();
  }, []);

  const fetchWhitelistWords = async () => {
    try {
      const res = await fetch("/api/whitelist");
      const data = await res.json();
      setWords(data.words || []);
    } catch (error) {
      console.error("Failed to fetch whitelist:", error);
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const avgMastery =
    words.length > 0
      ? Math.round(
          (words.reduce((sum, w) => sum + (w.masteryLevel || 0), 0) /
            words.length) *
            20
        )
      : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <h1 className="text-xl font-semibold">白名单</h1>
      </header>

      {/* Stats Section */}
      <div className="px-4 py-4 bg-muted/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{words.length}</p>
            <p className="text-xs text-foreground/60">单词数</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{avgMastery}%</p>
            <p className="text-xs text-foreground/60">平均掌握</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-xs text-foreground/60">连续天数</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (words.length > 0) {
              router.push(`/app/whitelist/train/${words[0].id}`);
            }
          }}
          disabled={words.length === 0}
          className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Flame className="w-5 h-5" />
          开始今日特训
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
        </div>
      ) : words.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Star className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-2">白名单是空的</h2>
          <p className="text-sm text-foreground/60 text-center">
            把难记的单词加入白名单，获得针对性的强化训练
          </p>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 gap-3 overflow-auto max-h-[calc(100vh-16rem)]">
          {words.map((word) => (
            <div
              key={word.id}
              onClick={() => router.push(`/app/whitelist/train/${word.id}`)}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer"
            >
              <h3 className="font-semibold text-lg mb-2">{word.word}</h3>
              <div className="mb-2">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(word.masteryLevel || 0) * 20}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/60">掌握度</span>
                <span className="text-xs font-medium">{word.masteryLevel || 0}/5</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
