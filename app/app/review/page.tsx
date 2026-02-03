"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Check,
  RotateCcw,
  Loader2,
  Sparkles,
  TrendingUp,
  Bell,
} from "lucide-react";
import type { ReviewResult } from "@/lib/algorithms/ebbinghaus";

// 艾宾浩斯遗忘曲线复习间隔
const EBBINGHAUS_INTERVALS = [
  { stage: 1, label: "第一次复习", interval: "立即", hours: 0 },
  { stage: 2, label: "第二次复习", interval: "12小时后", hours: 12 },
  { stage: 3, label: "第三次复习", interval: "1天后", hours: 24 },
  { stage: 4, label: "第四次复习", interval: "2天后", hours: 48 },
  { stage: 5, label: "第五次复习", interval: "4天后", hours: 96 },
  { stage: 6, label: "第六次复习", interval: "7天后", hours: 168 },
  { stage: 7, label: "第七次复习", interval: "15天后", hours: 360 },
  { stage: 8, label: "第八次复习", interval: "30天后", hours: 720 },
];

// 复习模式类型
type ReviewMode = "recall" | "choice" | "spelling";

// 单词状态
interface WordReviewItem {
  id: string;
  word: string;
  definitions?: any;
  ai_name?: string;
  ai_self_intro?: string;
  mastery_level?: number;
}

// 复习会话状态
interface ReviewSession {
  words: WordReviewItem[];
  currentIndex: number;
  correct: number;
  total: number;
  mode: ReviewMode;
}

// 选择题选项
interface ChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export default function ReviewPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [currentMode, setCurrentMode] = useState<ReviewMode>("recall");
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [userSpelling, setUserSpelling] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [choices, setChoices] = useState<ChoiceOption[]>([]);

  // 获取待复习的单词
  const fetchReviewWords = useCallback(async () => {
    try {
      const res = await fetch("/api/reviews");
      const data = await res.json();

      if (data.words && data.words.length > 0) {
        setSession({
          words: data.words,
          currentIndex: 0,
          correct: 0,
          total: data.words.length,
          mode: "recall",
        });
      } else {
        setCompleted(true);
      }
    } catch (error) {
      console.error("Failed to fetch review words:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewWords();
  }, [fetchReviewWords]);

  // 当前单词
  const currentWord = session?.words[session.currentIndex];

  // 生成选择题选项
  useEffect(() => {
    if (currentMode === "choice" && currentWord) {
      generateChoices(currentWord);
    }
  }, [currentMode, currentWord]);

  const generateChoices = (word: WordReviewItem) => {
    // 简单实现：从预设的干扰项中生成
    const definitions = word.definitions || [];
    const correctDef = definitions.length > 0 ? definitions[0] : null;

    if (!correctDef) {
      setChoices([]);
      return;
    }

    const dummyDefs = [
      "一个普通的词汇",
      "不太常见的用法",
      "正式的表达方式",
      "口语化的说法",
    ];

    const options: ChoiceOption[] = [
      { id: "correct", text: correctDef.definition || "正确答案", isCorrect: true },
      ...dummyDefs.slice(0, 3).map((text, i) => ({
        id: `dummy-${i}`,
        text,
        isCorrect: false,
      })),
    ];

    // 打乱顺序
    setChoices(options.sort(() => Math.random() - 0.5));
  };

  // 处理复习结果
  const handleResult = async (result: ReviewResult) => {
    if (!currentWord || submitting) return;

    setSubmitting(true);

    try {
      const timeSpent = Math.floor((Date.now() - (session as any).startTime) / 1000);

      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: currentWord.id,
          result,
          timeSpent,
        }),
      });

      // 记录统计
      await fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "review", result, timeSpent }),
      });

      const newCorrect = session.correct + (result === "good" || result === "easy" ? 1 : 0);

      // 移动到下一个单词
      const nextIndex = session.currentIndex + 1;
      if (nextIndex >= session.words.length) {
        setCompleted(true);
      } else {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                currentIndex: nextIndex,
                correct: newCorrect,
              }
            : null
        );
        resetState();
      }
    } catch (error) {
      console.error("Failed to submit review:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // 重置状态
  const resetState = () => {
    setShowAnswer(false);
    setUserSpelling("");
    setSelectedChoice(null);
    (session as any).startTime = Date.now();
  };

  // 切换模式
  const switchMode = (mode: ReviewMode) => {
    setCurrentMode(mode);
    resetState();
  };

  // 提交拼写
  const submitSpelling = () => {
    if (!currentWord) return;
    const isCorrect = userSpelling.toLowerCase() === currentWord.word.toLowerCase();
    handleResult(isCorrect ? "easy" : "forgot");
  };

  // 提交选择题
  const submitChoice = () => {
    if (!selectedChoice) return;
    const isCorrect = choices.find((c) => c.id === selectedChoice)?.isCorrect;
    handleResult(isCorrect ? "good" : "hard");
  };

  // 加载中
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="h-6 w-20 bg-muted rounded animate-pulse" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
        </div>
      </div>
    );
  }

  // 完成状态
  if (completed || !session || session.words.length === 0) {
    return (
      <div className="flex flex-col h-full bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
          <button
            onClick={() => router.push("/app")}
            className="flex items-center gap-2 text-foreground/60 hover:text-foreground"
          >
            <X className="w-5 h-5" />
            <span>完成</span>
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center overflow-auto">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>

          {completed && session ? (
            <>
              <h2 className="text-2xl font-bold mb-2">复习完成！</h2>
              <p className="text-foreground/60 mb-6">
                今天你复习了 <span className="text-primary font-semibold">{session.total}</span>{" "}
                个单词
              </p>
              <div className="flex gap-8 mb-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-500">{session.correct}</p>
                  <p className="text-xs text-foreground/60">正确</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-500">
                    {session.total - session.correct}
                  </p>
                  <p className="text-xs text-foreground/60">需加强</p>
                </div>
              </div>

              {/* 艾宾浩斯遗忘曲线说明 */}
              <div className="w-full max-w-md bg-muted/30 rounded-xl p-4 mb-6 text-left">
                <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  艾宾浩斯遗忘曲线复习计划
                </h3>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {EBBINGHAUS_INTERVALS.map((item) => (
                    <div key={item.stage} className="text-center p-2 bg-background rounded-lg">
                      <p className="font-medium text-primary">{item.stage}</p>
                      <p className="text-foreground/60">{item.interval}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-foreground/50 mt-3 text-center">
                  按照科学间隔复习，长期记忆效果最佳
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">太棒了！</h2>
              <p className="text-foreground/60 mb-8">当前没有需要复习的单词</p>
            </>
          )}

          <button
            onClick={() => router.push("/app")}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const progress = ((session.currentIndex + 1) / session.total) * 100;
  const correctRate = session.total > 0 ? (session.correct / session.total) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push("/app")}
            className="text-foreground/60 hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm text-foreground/60">
            {session.currentIndex + 1} / {session.total}
          </span>
          <div className="w-5" />
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* 艾宾浩斯遗忘曲线提示 */}
      <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900">
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
          <Bell className="w-4 h-4" />
          <span className="font-medium">艾宾浩斯遗忘曲线复习</span>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          按科学规律复习，记忆效果提升10倍
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Mode Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => switchMode("recall")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentMode === "recall"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/60 hover:text-foreground"
            }`}
          >
            回忆
          </button>
          <button
            onClick={() => switchMode("choice")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentMode === "choice"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/60 hover:text-foreground"
            }`}
          >
            选择
          </button>
          <button
            onClick={() => switchMode("spelling")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentMode === "spelling"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/60 hover:text-foreground"
            }`}
          >
            拼写
          </button>
        </div>

        {/* Review Card */}
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 shadow-lg">
          {currentMode === "recall" && currentWord && <RecallMode word={currentWord} showAnswer={showAnswer} />}
          {currentMode === "choice" && <ChoiceMode choices={choices} selected={selectedChoice} onSelect={setSelectedChoice} />}
          {currentMode === "spelling" && currentWord && <SpellingMode word={currentWord} value={userSpelling} onChange={setUserSpelling} onSubmit={submitSpelling} />}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-md">
          {!showAnswer && currentMode === "recall" ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
            >
              显示答案
            </button>
          ) : currentMode === "spelling" ? (
            <button
              onClick={submitSpelling}
              disabled={!userSpelling.trim() || submitting}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "提交答案"}
            </button>
          ) : currentMode === "choice" ? (
            <button
              onClick={submitChoice}
              disabled={!selectedChoice || submitting}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "确认选择"}
            </button>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => handleResult("forgot")}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                忘记
              </button>
              <button
                onClick={() => handleResult("hard")}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                模糊
              </button>
              <button
                onClick={() => handleResult("good")}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                记得
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="border-t border-border px-6 py-4 bg-muted/30">
        <div className="flex justify-around max-w-md mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-500">
              <TrendingUp className="w-4 h-4" />
              <span className="font-bold">{Math.round(correctRate)}%</span>
            </div>
            <p className="text-xs text-foreground/60">正确率</p>
          </div>
          <div className="text-center">
            <p className="font-bold">{session.correct}</p>
            <p className="text-xs text-foreground/60">已掌握</p>
          </div>
          <div className="text-center">
            <p className="font-bold">{session.total - session.correct}</p>
            <p className="text-xs text-foreground/60">需加强</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 回忆模式组件
function RecallMode({
  word,
  showAnswer,
}: {
  word: WordReviewItem;
  showAnswer: boolean;
}) {
  if (!word) return null;

  const definitions = word.definitions || [];
  const primaryDef = definitions[0];

  return (
    <div className="text-center">
      {!showAnswer ? (
        <>
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary">
              {word.word.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-2">{word.word}</h2>
          <p className="text-foreground/60">你还记得这个词的意思吗？</p>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-4">{word.word}</h2>
          {word.ai_self_intro && (
            <p className="text-sm text-primary mb-4 italic">"{word.ai_self_intro}"</p>
          )}
          {primaryDef && (
            <div className="bg-muted rounded-lg p-4 text-left">
              <p className="text-sm text-foreground/60 mb-1">{primaryDef.partOfSpeech}</p>
              <p className="font-medium">{primaryDef.definition}</p>
              {primaryDef.chinese && (
                <p className="text-sm text-foreground/60 mt-1">{primaryDef.chinese}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 选择模式组件
function ChoiceMode({ choices, selected, onSelect }: { choices: ChoiceOption[]; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="text-center">
      <p className="text-foreground/60 mb-6">请选择正确的释义</p>
      <div className="space-y-3">
        {choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => onSelect(choice.id)}
            className={`w-full p-4 rounded-lg text-left transition-colors ${
              selected === choice.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/70"
            }`}
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}

// 拼写模式组件
function SpellingMode({
  word,
  value,
  onChange,
  onSubmit,
}: {
  word: WordReviewItem;
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl font-bold text-primary">?</span>
      </div>
      <p className="text-foreground/60 mb-6">请拼写这个单词</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="输入单词拼写..."
        className="w-full px-4 py-3 bg-muted rounded-lg text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSubmit();
          }
        }}
      />
    </div>
  );
}
