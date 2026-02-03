"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Upload, FileText, X, Download, Loader2, Check, ChevronLeft as ChevronLeftIcon, ChevronRight, Trash2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// 艾宾浩斯遗忘曲线复习间隔（分钟）
const REVIEW_INTERVALS = {
  short: [60, 240, 720], // 1小时, 4小时, 12小时
  long: [1, 2, 4, 7, 15, 31], // D1, D2, D4, D7, D15, D31
};

// 每页显示的单词数量
const WORDS_PER_PAGE = 16;

interface WordRecord {
  id: string;
  word: string;
  pronunciation: string;
  definitions: string[];
  mastery_level: number;
  added_at: string;
  next_review_at: string;
  review_count: number;
  // 短效记忆状态
  short_reviews: boolean[]; // [1H, 4H, 12H]
  // 长效记忆状态
  long_reviews: boolean[]; // [D1, D2, D4, D7, D15, D31]
}

export default function NotebookPage() {
  const router = useRouter();
  const [words, setWords] = useState<WordRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; skipped: number; errors: string[] } | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{ word: string; chinese?: string; definition?: string }[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [swipedWordId, setSwipedWordId] = useState<string | null>(null);
  const [subscriptionCheck, setSubscriptionCheck] = useState<{ canAccess: boolean; tier: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWords();
  }, []);

  // 检查订阅权限
  useEffect(() => {
    checkSubscription();
  }, []);

  // 单词列表变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [words.length]);

  const checkSubscription = async () => {
    try {
      const res = await fetch("/api/subscription/check?feature=canUseNotebook");
      if (res.ok) {
        const data = await res.json();
        setSubscriptionCheck({ canAccess: data.allowed, tier: data.tier });
      }
    } catch (error) {
      console.error("Failed to check subscription:", error);
    }
  };

  const fetchWords = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("word_friends")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // 转换为笔记本格式
      const records: WordRecord[] = (data || []).map((w: any) => ({
        id: w.id,
        word: w.word,
        pronunciation: w.pronunciation || "",
        definitions: w.definitions || [],
        mastery_level: w.mastery_level || 0,
        added_at: w.created_at,
        next_review_at: w.next_review_at || "",
        review_count: w.review_count || 0,
        short_reviews: w.short_reviews || [false, false, false],
        long_reviews: w.long_reviews || [false, false, false, false, false, false],
      }));

      setWords(records);
    } catch (error) {
      console.error("Failed to fetch words:", error);
    } finally {
      setLoading(false);
    }
  };

  // 标记复习完成/取消（切换状态）
  const markReview = async (wordId: string, type: 'short' | 'long', index: number) => {
    try {
      const supabase = createClient();

      // 获取当前单词数据
      const { data: currentWord } = await supabase
        .from("word_friends")
        .select("short_reviews, long_reviews, review_count, mastery_level, created_at, next_review_at")
        .eq("id", wordId)
        .single();

      if (!currentWord) return;

      // 更新复习记录（切换状态）
      const shortReviews = (currentWord.short_reviews || [false, false, false]);
      const longReviews = (currentWord.long_reviews || [false, false, false, false, false, false]);

      // 切换状态：true变false，false变true
      const isNewCompletion = type === 'short'
        ? !shortReviews[index]
        : !longReviews[index];

      if (type === 'short') {
        shortReviews[index] = !shortReviews[index];
      } else {
        longReviews[index] = !longReviews[index];
      }

      // 计算新的掌握度
      const newMasteryLevel = Math.min(
        5,
        Math.floor(((shortReviews.filter(Boolean).length + longReviews.filter(Boolean).length) / 9) * 5)
      );

      // 如果是新完成（变成绿色），计算下一个复习时间
      let nextReviewAt = currentWord.next_review_at;
      if (isNewCompletion) {
        nextReviewAt = calculateNextReviewTime(shortReviews, longReviews, currentWord.created_at);
      }

      // 保存到数据库
      const { error } = await supabase
        .from("word_friends")
        .update({
          short_reviews: shortReviews,
          long_reviews: longReviews,
          review_count: (currentWord.review_count || 0) + (isNewCompletion ? 1 : 0),
          mastery_level: newMasteryLevel,
          next_review_at: nextReviewAt,
        })
        .eq("id", wordId);

      if (error) {
        console.error("Failed to save review:", error);
        return;
      }

      // 更新本地状态
      const updated = words.map(w => {
        if (w.id === wordId) {
          return {
            ...w,
            short_reviews: shortReviews,
            long_reviews: longReviews,
            mastery_level: newMasteryLevel,
            next_review_at: nextReviewAt,
          };
        }
        return w;
      });
      setWords(updated);
    } catch (error) {
      console.error("Failed to mark review:", error);
    }
  };

  // 计算下一个复习时间
  const calculateNextReviewTime = (
    shortReviews: boolean[],
    longReviews: boolean[],
    createdAt: string
  ): string => {
    const shortIntervals = [60, 240, 720]; // 1小时, 4小时, 12小时（分钟）
    const longIntervals = [1, 2, 4, 7, 15, 31]; // D1, D2, D4, D7, D15, D31（天）

    // 检查是否有任何已完成的格子
    const hasAnyCompleted = shortReviews.some(Boolean) || longReviews.some(Boolean);

    // 如果没有任何绿色格子（都没复习过），1小时后提醒
    if (!hasAnyCompleted) {
      const nextTime = new Date();
      nextTime.setHours(nextTime.getHours() + 1);
      return nextTime.toISOString();
    }

    // 有绿色格子，找下一个未完成的
    // 检查短效记忆：找到下一个未完成的
    for (let i = 0; i < shortReviews.length; i++) {
      if (!shortReviews[i]) {
        // 下一个是短效记忆的第i个
        const nextTime = new Date();
        nextTime.setMinutes(nextTime.getMinutes() + shortIntervals[i]);
        return nextTime.toISOString();
      }
    }

    // 检查长效记忆：找到下一个未完成的
    for (let i = 0; i < longReviews.length; i++) {
      if (!longReviews[i]) {
        // 下一个是长效记忆的第i个
        const nextTime = new Date();
        nextTime.setDate(nextTime.getDate() + longIntervals[i]);
        return nextTime.toISOString();
      }
    }

    // 全部完成，设置31天后
    const nextTime = new Date();
    nextTime.setDate(nextTime.getDate() + 31);
    return nextTime.toISOString();
  };

  // 删除单词
  const deleteWord = async (wordId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("word_friends")
        .delete()
        .eq("id", wordId);

      if (error) throw error;

      // 更新本地状态
      setWords(words.filter(w => w.id !== wordId));
      setSwipedWordId(null);
    } catch (error) {
      console.error("Failed to delete word:", error);
    }
  };

  // 第一步：AI解析内容
  const handleParseContent = async () => {
    setParsing(true);
    setParsedPreview(null);
    setImportResult(null);

    try {
      let content = "";
      let filename = "paste";

      // 方式1: 从文件读取
      if (importFile) {
        console.log("Reading file:", importFile.name, importFile.size, "bytes");
        try {
          content = await importFile.text();
          filename = importFile.name;
          console.log("File content length:", content.length);
        } catch (fileError: any) {
          console.error("File read error:", fileError);
          setImportResult({
            success: 0,
            skipped: 0,
            errors: [
              "文件读取失败：" + fileError.message,
              "建议：用记事本打开文件，全选复制内容，然后粘贴到下方的文本框中"
            ]
          });
          return;
        }
      }
      // 方式2: 从粘贴内容读取
      else {
        const textarea = document.getElementById('pasteInput') as HTMLTextAreaElement;
        content = textarea?.value || "";
        console.log("Paste content length:", content.length);
      }

      if (!content.trim()) {
        setImportResult({ success: 0, skipped: 0, errors: ["内容为空，请确保文件有内容或已粘贴文本"] });
        return;
      }

      // 调用AI解析API
      const res = await fetch("/api/import/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, filename }),
      });

      const data = await res.json();
      console.log("API response:", data);

      if (!res.ok) {
        setImportResult({ success: 0, skipped: 0, errors: [data.error || "解析失败"] });
        return;
      }

      // 检查解析结果
      if (!data.words || data.words.length === 0) {
        setImportResult({
          success: 0,
          skipped: 0,
          errors: ["AI未识别到有效单词，请检查内容格式或尝试其他格式"]
        });
        return;
      }

      // 显示解析预览
      setParsedPreview(data.words);
      console.log("Parsed words:", data.words.length);
    } catch (error: any) {
      console.error("Parse error:", error);
      setImportResult({
        success: 0,
        skipped: 0,
        errors: ["解析失败：" + error.message]
      });
    } finally {
      setParsing(false);
    }
  };

  // 第二步：确认导入
  const handleImport = async () => {
    if (!parsedPreview || parsedPreview.length === 0) {
      // 如果没有预览，先解析
      await handleParseContent();
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const supabase = createClient();

      // 获取 user_id
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        setImportResult({ success: 0, skipped: 0, errors: ["未登录，请先登录"] });
        return;
      }

      // 获取已存在的单词
      const { data: existingWords } = await supabase
        .from("word_friends")
        .select("word")
        .eq("user_id", userId);

      const existingSet = new Set(existingWords?.map((w: any) => w.word) || []);

      // 过滤新单词
      const newWords = parsedPreview.filter((w) => !existingSet.has(w.word.toLowerCase()));

      if (newWords.length === 0) {
        setImportResult({
          success: 0,
          skipped: parsedPreview.length,
          errors: []
        });
        return;
      }

      // 分批插入（每批100个）
      const batchSize = 100;
      let addedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < newWords.length; i += batchSize) {
        const batch = newWords.slice(i, i + batchSize);
        const { data: dictWords } = await supabase
          .from("word_dictionary")
          .select("*")
          .in("word", batch.map((w) => w.word.toLowerCase()));

        const dictMap = new Map(dictWords?.map((w: any) => [w.word, w]) || []);

        const wordsToInsert = batch.map((item) => {
          const normalized = item.word.trim().toLowerCase();
          const dictWord = dictMap.get(normalized);
          // 设置1小时后的提醒时间（首次提醒）
          const nextReviewTime = new Date();
          nextReviewTime.setHours(nextReviewTime.getHours() + 1);
          return {
            user_id: userId,
            word: normalized,
            pronunciation: dictWord?.pronunciation || null,
            part_of_speech: dictWord?.part_of_speech?.[0] || null,
            definitions: dictWord?.definitions || [],
            frequency_rank: dictWord?.frequency_rank || null,
            difficulty_score: dictWord?.difficulty || 1,
            next_review_at: nextReviewTime.toISOString(),
          };
        });

        const { data: inserted } = await supabase
          .from("word_friends")
          .insert(wordsToInsert)
          .select();

        addedCount += inserted?.length || 0;
      }

      setImportResult({
        success: addedCount,
        skipped: parsedPreview.length - addedCount,
        errors
      });

      // 刷新单词列表
      if (addedCount > 0) {
        await fetchWords();
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({
        success: 0,
        skipped: 0,
        errors: ["导入失败：" + (error as any).message]
      });
    } finally {
      setImporting(false);
    }
  };

  // 解析文件内容
  const parseFileContent = (content: string, filename: string): string[] => {
    const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const words: string[] = [];

    for (const line of lines) {
      // 跳过空行和注释行
      if (!line || line.startsWith('#') || line.startsWith('//')) {
        continue;
      }

      // CSV 格式处理
      if (filename.endsWith('.csv') || line.includes(',')) {
        const parts = line.split(',');
        const word = parts[0].trim().replace(/^["']|["']$/g, ''); // 去除引号
        if (/^[a-zA-Z]{2,}$/.test(word)) {
          words.push(word);
        }
      }
      // 纯单词行
      else if (/^[a-zA-Z]{2,}$/.test(line)) {
        words.push(line);
      }
      // 从句子中提取英文单词
      else {
        const wordMatches = line.match(/\b[a-zA-Z]{3,}\b/g);
        if (wordMatches) {
          words.push(...wordMatches);
        }
      }
    }

    // 去重
    return Array.from(new Set(words.map((w) => w.toLowerCase())));
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  };

  // 计算从添加到现在经过的时间
  const getDaysSinceAdded = (dateStr: string) => {
    const added = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // 生成页码数组（带省略号）
  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 4, "...", total];
    }

    if (current >= total - 2) {
      return [1, "...", total - 3, total - 2, total - 1, total];
    }

    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  // 显示升级提示
  if (subscriptionCheck && !subscriptionCheck.canAccess) {
    return (
      <div className="flex flex-col h-full bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">升级到高级版</h2>
            <p className="text-sm text-foreground/60 mb-6">
              艾宾浩斯单词本是高级版功能，升级后可使用科学记忆法高效学习
            </p>
            <div className="space-y-3 text-sm bg-muted/50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-left">科学复习间隔（1H→4H→12H→D1→D2→D4→D7→D15→D31）</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-left">视觉化复习进度追踪</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-left">自动到时间提醒复习</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-left">500个单词容量（免费版50个）</span>
              </div>
            </div>
            <button
              onClick={() => router.push("/app/subscription")}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              查看订阅套餐
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-lg font-semibold">艾宾浩斯单词本</h1>
            <p className="text-xs text-foreground/60">科学记忆，高效复习</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowImportModal(true)}
            className="text-primary"
          >
            <Upload className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <div className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{words.length}</p>
            <p className="text-xs text-foreground/60">总单词</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {words.filter(w => w.mastery_level >= 4).length}
            </p>
            <p className="text-xs text-foreground/60">已掌握</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {words.filter(w => w.next_review_at && new Date(w.next_review_at) <= new Date()).length}
            </p>
            <p className="text-xs text-foreground/60">待复习</p>
          </div>
        </div>
      </div>

      {/* Word List - Ebbinghaus Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : words.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium mb-2">单词本是空的</h2>
            <p className="text-sm text-foreground/60">添加单词开始学习吧</p>
          </div>
        ) : (
          <div className="p-2">
            {/* Table Header */}
            <div className="grid grid-cols-[30px_80px_1fr_80px] gap-1 px-2 py-2 bg-muted/50 text-xs font-medium text-foreground/70 sticky top-0">
              <div className="text-center">#</div>
              <div>单词</div>
              <div className="text-center">艾宾浩斯复习</div>
              <div className="text-center">词义</div>
            </div>

            {/* Word Rows - 分页显示 */}
            {words
              .slice((currentPage - 1) * WORDS_PER_PAGE, currentPage * WORDS_PER_PAGE)
              .map((word, pageIndex) => {
                const globalIndex = (currentPage - 1) * WORDS_PER_PAGE + pageIndex;
                const daysSinceAdded = getDaysSinceAdded(word.added_at);
                const isDue = word.next_review_at && new Date(word.next_review_at) <= new Date();
                const isSwiped = swipedWordId === word.id;

                return (
                  <div
                    key={word.id}
                    className="relative overflow-hidden border-b border-border"
                  >
                    {/* 删除按钮（滑出后显示） */}
                    <div
                      className={cn(
                        "absolute inset-y-0 right-0 flex items-center justify-end transition-transform duration-300 ease-out",
                        isSwiped ? "translate-x-0" : "translate-x-full"
                      )}
                      style={{ width: "80px" }}
                    >
                      <button
                        onClick={() => deleteWord(word.id)}
                        className="h-full w-full bg-red-500 text-white flex items-center justify-center"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* 单词行内容 */}
                    <div
                      onClick={() => !isSwiped && router.push(`/app/word-detail/${word.id}`)}
                      onTouchStart={(e) => {
                        setSwipedWordId(null);
                      }}
                      onTouchMove={(e) => {
                        const touch = e.touches[0];
                        const target = e.currentTarget;
                        const rect = target.getBoundingClientRect();
                        const startX = rect.left;

                        // 如果向左滑动超过50px
                        if (startX - touch.clientX > 50) {
                          setSwipedWordId(word.id);
                        }
                      }}
                      onTransitionEnd={() => {
                        if (!isSwiped) {
                          setSwipedWordId(null);
                        }
                      }}
                      className={cn(
                        "grid grid-cols-[30px_80px_1fr_80px] gap-1 px-2 py-2 bg-background hover:bg-muted/50 transition-all duration-300 cursor-pointer relative z-10",
                        isDue && "bg-orange-50/50 dark:bg-orange-950/20",
                        isSwiped && "-translate-x-20"
                      )}
                    >
                      {/* 序号 */}
                      <div className="text-xs text-foreground/60 text-center pt-1">{globalIndex + 1}</div>

                      {/* 单词 */}
                      <div>
                        <p className="text-sm font-medium">{word.word}</p>
                        {word.pronunciation && (
                          <p className="text-xs text-foreground/40">/{word.pronunciation}/</p>
                        )}
                      </div>

                      {/* 艾宾浩斯复习格子 */}
                      <div className="flex gap-0.5 items-center justify-center">
                        {/* 短效记忆: 1H, 4H, 12H */}
                        {REVIEW_INTERVALS.short.map((_, i) => {
                          const completed = word.short_reviews[i];
                          const shouldReview = !completed && daysSinceAdded >= 1;
                          return (
                            <div
                              key={`s${i}`}
                              className={cn(
                                "w-5 h-5 rounded flex items-center justify-center",
                                completed
                                  ? "bg-green-500 text-white text-[10px]"
                                  : shouldReview
                                    ? "bg-orange-200 dark:bg-orange-900/50"
                                    : "bg-muted"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                markReview(word.id, 'short', i);
                              }}
                            >
                              {completed && <Check className="w-3 h-3" />}
                            </div>
                          );
                        })}

                        {/* 分隔线 */}
                        <div className="w-px h-4 bg-border mx-1" />

                        {/* 长效记忆: D1, D2, D4, D7, D15, D31 */}
                        {REVIEW_INTERVALS.long.map((day, i) => {
                          const completed = word.long_reviews[i];
                          const shouldReview = !completed && daysSinceAdded >= day;
                          return (
                            <div
                              key={`l${i}`}
                              className={cn(
                                "w-5 h-5 rounded flex items-center justify-center text-[8px]",
                                completed
                                  ? "bg-purple-500 text-white"
                                  : shouldReview
                                    ? "bg-blue-200 dark:bg-blue-900/50"
                                    : "bg-muted text-foreground/40"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                markReview(word.id, 'long', i);
                              }}
                            >
                              {completed ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <span className="scale-75">D{day}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* 词义 */}
                      <div className="text-xs text-foreground/60 truncate pt-1">
                        {word.definitions?.slice(0, 1).join("; ")}
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* 分页控件 */}
            {Math.ceil(words.length / WORDS_PER_PAGE) > 1 && (
              <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground/60">
                    第 {currentPage} / {Math.ceil(words.length / WORDS_PER_PAGE)} 页
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-3"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </Button>
                    <div className="flex gap-1">
                      {getPageNumbers(currentPage, Math.ceil(words.length / WORDS_PER_PAGE)).map((pageNum, i) => (
                        pageNum === "..." ? (
                          <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-foreground/40">
                            ...
                          </span>
                        ) : (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum as number)}
                            className={cn(
                              "w-8 h-8 rounded text-sm font-medium transition-colors",
                              currentPage === pageNum
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground/70 hover:bg-muted/80"
                            )}
                          >
                            {pageNum}
                          </button>
                        )
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(words.length / WORDS_PER_PAGE), p + 1))}
                      disabled={currentPage === Math.ceil(words.length / WORDS_PER_PAGE)}
                      className="h-8 px-3"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-muted/30 border-t border-border">
        <div className="flex items-center justify-center gap-4 text-xs text-foreground/60">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>已完成</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900/50"></div>
            <span>待复习</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted"></div>
            <span>未到时间</span>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">批量导入单词</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowImportModal(false);
                  setParsedPreview(null);
                  setImportResult(null);
                  setImportFile(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* 步骤指示 */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                parsedPreview ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
              }`}>
                {parsedPreview ? <Check className="w-4 h-4" /> : "1"}
              </div>
              <div className="flex-1 h-px bg-border"></div>
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                parsedPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                2
              </div>
            </div>

            {/* 导入说明 */}
            {!parsedPreview && (
              <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg text-sm">
                <p className="font-medium text-foreground mb-2">AI 智能识别排版格式</p>
                <p className="text-xs text-foreground/70 mb-2">直接复制粘贴任意格式的内容，AI会自动识别并提取单词：</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                    <p className="font-medium text-foreground/80 mb-1">📝 简单列表</p>
                    <p className="text-foreground/60 font-mono text-[10px]">hello<br/>world<br/>test</p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                    <p className="font-medium text-foreground/80 mb-1">📋 带释义</p>
                    <p className="text-foreground/60 font-mono text-[10px]">hello - 你好<br/>world: 世界</p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                    <p className="font-medium text-foreground/80 mb-1">📊 表格复制</p>
                    <p className="text-foreground/60 font-mono text-[10px]">Excel/Word<br/>表格内容</p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                    <p className="font-medium text-foreground/80 mb-1">📄 混合文本</p>
                    <p className="text-foreground/60 font-mono text-[10px]">文章中提取<br/>英文单词</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI 解析预览 */}
            {parsedPreview && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    识别到 {parsedPreview.length} 个单词
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setParsedPreview(null)}
                    className="text-xs text-foreground/60"
                  >
                    重新识别
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto bg-muted/30 rounded-lg p-2 space-y-1">
                  {parsedPreview.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 bg-card rounded text-sm"
                    >
                      <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary text-xs rounded font-medium">
                        {i + 1}
                      </span>
                      <span className="font-medium">{item.word}</span>
                      {item.chinese && (
                        <span className="text-foreground/60 text-xs">- {item.chinese}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 导入结果 */}
            {importResult && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                  导入完成！
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  ✅ 成功：{importResult.success} 个 | ⏭️ 跳过：{importResult.skipped} 个
                </p>
                {importResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer">查看错误</summary>
                    <ul className="mt-1 text-xs text-red-500">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            {/* 文件选择 */}
            {!parsedPreview && (
              <div className="space-y-4">
                {/* 粘贴输入（推荐方式） */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    📝 粘贴内容（推荐）
                    <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">支持任意格式</span>
                  </label>
                  <textarea
                    placeholder="直接从Word、Excel、网页、记事本等处复制粘贴，AI会自动识别格式并提取单词&#10;&#10;例如：&#10;hello&#10;world&#10;test&#10;&#10;或：&#10;hello - 你好&#10;world: 世界"
                    className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={6}
                    id="pasteInput"
                    onChange={() => {
                      setParsedPreview(null);
                      setImportFile(null);
                    }}
                  />
                </div>

                {/* 或者文件上传 */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-foreground/60">或 上传文件</span>
                  </div>
                </div>

                <div
                  className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImportFile(file);
                        setParsedPreview(null);
                      }
                    }}
                  />
                  <Upload className="w-6 h-6 mx-auto text-foreground/60 mb-1" />
                  <p className="text-xs text-foreground/60">
                    {importFile ? importFile.name : "点击选择 .txt 或 .csv 文件"}
                  </p>
                  <p className="text-[10px] text-foreground/40 mt-1">
                    注意：如遇到文件读取错误，请使用复制粘贴方式
                  </p>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportModal(false);
                  setParsedPreview(null);
                  setImportResult(null);
                  setImportFile(null);
                }}
                className="flex-1"
              >
                取消
              </Button>
              {parsedPreview ? (
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      确认导入 ({parsedPreview.length})
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleParseContent}
                  disabled={parsing || (!importFile && !(document.getElementById('pasteInput') as HTMLTextAreaElement)?.value)}
                  className="flex-1"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      AI 识别中...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      AI 识别
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}