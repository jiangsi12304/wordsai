"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, Loader2, Flame, Bell, BookOpen, Info, X, Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import { WordChatItem, type WordChatItemData } from "@/components/ui/swipeable-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ReminderStatus {
  dueCount: number;
  reviewedToday: number;
  unreadReminders: number;
}

export default function HomePage() {
  const [words, setWords] = useState<WordChatItemData[]>([]);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus | null>(null);
  const [showReminderBanner, setShowReminderBanner] = useState(false);
  const [showFeatureIntro, setShowFeatureIntro] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    try {
      // 获取所有有聊天消息的单词（不只是待复习的）
      const res = await fetch("/api/words?withMessages=true");
      const data = await res.json();
      console.log("Words data:", data);

      // 过滤出待复习的单词数量
      const pendingWords = data.words?.filter((w: any) => {
        const reviewTime = w.next_review_at;
        return reviewTime && new Date(reviewTime) <= new Date();
      }) || [];
      setPendingReviewCount(pendingWords.length);

      // 按最新聊天时间排序的单词列表
      setWords(data.words || []);
    } catch (error) {
      console.error("Failed to fetch words:", error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = reminderStatus?.unreadReminders ?? 0;
  const dueCount = reminderStatus?.dueCount ?? 0;

  const handleSwipeLeft = async (wordId: string) => {
    // 忘记了 - 暂时只是移出列表
    setWords((prev) => prev.filter((w) => w.id !== wordId));
  };

  const handleSwipeRight = async (wordId: string) => {
    // 记住了 - 提交复习结果
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId, result: "good" }),
      });
      setWords((prev) => prev.filter((w) => w.id !== wordId));
    } catch (error) {
      console.error("Failed to submit review:", error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days === 1) return "昨天";
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">消息</h1>
          {unreadCount > 0 && (
            <span className="relative">
              <Bell className="w-5 h-5 text-primary" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFeatureIntro(true)}
            className="p-2 text-foreground/60 hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Reminder Banner (艾宾浩斯遗忘曲线提醒) */}
      {showReminderBanner && dueCount > 0 && (
        <div className="mx-4 mb-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 animate-pulse" />
              <div>
                <p className="font-medium text-sm">艾宾浩斯遗忘曲线提醒</p>
                <p className="text-xs opacity-90">
                  今天有 {dueCount} 个单词需要复习
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setShowReminderBanner(false)}
            >
              知道了
            </Button>
          </div>
        </div>
      )}

      {/* Review Banner (when pending reviews exist) */}
      {pendingReviewCount > 0 && (
        <Link
          href="/app/review"
          className="mx-4 mb-3 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5" />
            <span className="font-medium">有 {pendingReviewCount} 个单词需要复习</span>
          </div>
          <span className="text-sm opacity-90">开始 →</span>
        </Link>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
        </div>
      ) : words.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-2">还没有单词好友</h2>
          <p className="text-sm text-foreground/60 text-center mb-6">
            添加你的第一个单词，开始与 AI 好友的对话之旅
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            + 添加单词
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {words.map((word) => {
            // 获取最新消息的第一行
            const lastMessage = (word as any).lastMessage;
            let previewMessage = "";
            let messageTime = "";

            console.log(`Word ${word.word}:`, { lastMessage });

            if (lastMessage) {
              // 取第一行，限制长度
              const firstLine = lastMessage.content.split('\n')[0];
              previewMessage = firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine;
              messageTime = formatTime(lastMessage.time);
            }

            return (
              <WordChatItem
                key={word.id}
                word={{
                  ...word,
                  lastMessage: previewMessage,
                  lastMessageTime: messageTime,
                }}
                onClick={() => router.push(`/app/verify/${word.id}`)}
                onSwipeLeft={() => handleSwipeLeft(word.id)}
                onSwipeRight={() => handleSwipeRight(word.id)}
              />
            );
          })}
        </div>
      )}

      {/* Add Word Modal */}
      {showAddModal && <AddWordModal onClose={() => setShowAddModal(false)} onAdd={fetchWords} />}

      {/* Feature Intro Modal */}
      {showFeatureIntro && <FeatureIntroModal onClose={() => setShowFeatureIntro(false)} />}
    </div>
  );
}

function FeatureIntroModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
      <div className="w-full max-w-md bg-background rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">功能介绍</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* 首页 */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">首页消息</h3>
            </div>
            <p className="text-foreground/70">查看待复习的单词，左滑复习，右跳过。最新消息预览一目了然。</p>
          </div>

          {/* 单词本 */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold">艾宾浩斯单词本</h3>
            </div>
            <p className="text-foreground/70 mb-2">科学复习，高效记忆！</p>
            <ul className="text-xs text-foreground/60 space-y-1">
              <li>• 短期记忆：1H → 4H → 12H</li>
              <li>• 长期记忆：D1 → D2 → D4 → D7 → D15 → D31</li>
              <li>• 点击格子标记完成，自动设置下次提醒</li>
              <li>• 到时间自动提醒："陛下，该翻臣妾的牌子了～"</li>
            </ul>
          </div>

          {/* 聊天 */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">AI 单词好友</h3>
            </div>
            <p className="text-foreground/70">每个单词都是活的！首次进入会详细介绍自己，陪你聊天学习。</p>
          </div>

          {/* 复习原理 */}
          <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold">艾宾浩斯遗忘曲线原理</h3>
            </div>
            <p className="text-foreground/70 mb-2">德国心理学家艾宾浩斯研究发现：</p>
            <ul className="text-xs text-foreground/60 space-y-1">
              <li>• 遗忘在学习后立即开始</li>
              <li>• 20分钟后遗忘42%</li>
              <li>• 1小时后遗忘56%</li>
              <li>• 1天后遗忘74%</li>
            </ul>
            <p className="text-xs text-foreground/60 mt-2">
              通过在关键时间点复习（1H→4H→12H→D1→D2...），可以将短时记忆转化为长时记忆。
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          知道了
        </button>
      </div>
    </div>
  );
}

function AddWordModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: () => void;
}) {
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    setLoading(true);
    setError("");
    setShowUpgradePrompt(false);

    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: word.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        onAdd();
        onClose();
        setWord("");
      } else if (res.status === 409) {
        setError("这个单词已经在你的好友列表中了");
      } else if (res.status === 403 && data.limitReached) {
        // 订阅限制
        setShowUpgradePrompt(true);
      } else {
        setError(data.error || "添加失败，请重试");
      }
    } catch (err) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
        <div className="w-full max-w-md bg-background rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">添加单词好友</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="输入单词（如：hello）"
              className="w-full px-4 py-3 bg-muted rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
              autoFocus
            />
            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                disabled={loading || !word.trim()}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "添加"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 升级提示 */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50">
          <div className="w-full max-w-sm bg-background rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                单词数量已达上限
              </h3>
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-foreground/70 mb-4">
              免费版最多添加 50 个单词，升级到高级版可获得 500 个单词额度。
            </p>
            <div className="space-y-2">
              <button
                onClick={() => router.push("/app/subscription")}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                查看订阅套餐
              </button>
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="w-full px-4 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
