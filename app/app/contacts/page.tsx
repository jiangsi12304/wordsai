"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Loader2, Search } from "lucide-react";
import { WordChatItem, type WordChatItemData } from "@/components/ui/swipeable-card";
import { useRouter } from "next/navigation";

export default function ContactsPage() {
  const [words, setWords] = useState<WordChatItemData[]>([]);
  const [filteredWords, setFilteredWords] = useState<WordChatItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchWords();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredWords(
        words.filter((w) =>
          w.word.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredWords(words);
    }
  }, [searchQuery, words]);

  const fetchWords = async () => {
    try {
      const res = await fetch("/api/words");
      const data = await res.json();
      setWords(data.words || []);
      setFilteredWords(data.words || []);
    } catch (error) {
      console.error("Failed to fetch words:", error);
    } finally {
      setLoading(false);
    }
  };

  // 按字母分组
  const groupedWords = filteredWords.reduce((acc, word) => {
    const letter = word.word.charAt(0).toUpperCase();
    if (!acc[letter]) {
      acc[letter] = [];
    }
    acc[letter].push(word);
    return acc;
  }, {} as Record<string, WordChatItemData[]>);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <h1 className="text-xl font-semibold">联系人</h1>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索单词..."
            className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-2">
            {searchQuery ? "没有找到匹配的单词" : "还没有单词好友"}
          </h2>
          <p className="text-sm text-foreground/60 text-center">
            {searchQuery
              ? "试试搜索其他单词"
              : "你的单词库是空的，添加一些单词开始学习吧"}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {Object.entries(groupedWords).map(([letter, words]) => (
            <div key={letter}>
              <div className="px-4 py-2 bg-muted/50 text-xs font-semibold text-foreground/60 sticky top-0">
                {letter}
              </div>
              <div className="divide-y divide-border">
                {words.map((word) => (
                  <WordChatItem
                    key={word.id}
                    word={word}
                    onClick={() => router.push(`/app/verify/${word.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
