"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  Volume2,
  Check,
  X,
  ArrowRight,
  Loader2,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  type: string;
  question: string;
  sentence?: string;
  hint?: string;
  audioUrl?: string;
  options?: { text: string; correct: boolean }[];
  topics?: string[];
  correctAnswer?: string;
}

interface TrainingData {
  word: string;
  stage: number;
  questions: Question[];
}

type Stage = 1 | 2 | 3;

const STAGE_NAMES = {
  1: "听力速记",
  2: "完形填空",
  3: "主动输出",
};

const STAGE_COLORS = {
  1: "bg-blue-500",
  2: "bg-purple-500",
  3: "bg-green-500",
};

export default function WhitelistTrainPage() {
  const router = useRouter();
  const params = useParams();
  const wordId = params.wordId as string;

  const [word, setWord] = useState<any>(null);
  const [trainingData, setTrainingData] = useState<TrainingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [currentStage, setCurrentStage] = useState<Stage>(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [outputText, setOutputText] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");

  const [feedback, setFeedback] = useState<{
    show: boolean;
    isCorrect: boolean;
    message: string;
  }>({ show: false, isCorrect: false, message: "" });

  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());

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

  const loadStageQuestions = async (stage: Stage) => {
    setSubmitting(true);
    try {
      // 优先使用 AI 生成题目
      const res = await fetch("/api/whitelist/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId, stage }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate questions");
      }

      const data = await res.json();
      setTrainingData(data);
      setCurrentQuestionIndex(0);
      setSelectedAnswer("");
      setOutputText("");
      setSelectedTopic("");
      setFeedback({ show: false, isCorrect: false, message: "" });
    } catch (error) {
      console.error("Failed to load questions:", error);
      // AI 失败时使用 fallback
      setFeedback({
        show: true,
        isCorrect: false,
        message: "题目生成失败，请重试",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (word) {
      loadStageQuestions(currentStage);
    }
  }, [currentStage, word]);

  const handleBack = () => {
    router.push("/app/whitelist");
  };

  const [isPlaying, setIsPlaying] = useState(false);

  const playAudio = async (audioUrlOrWord: string) => {
    if (isPlaying) return;
    setIsPlaying(true);

    const wordText = word?.word || "";

    // 定义多个音频源
    const audioSources = [
      // 1. 题目提供的音频 URL
      audioUrlOrWord?.startsWith("http") && { url: audioUrlOrWord, name: "题目音频" },
      // 2. 有道词典 API
      {
        url: `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(wordText)}`,
        name: "有道词典",
      },
      // 3. Google TTS API
      {
        url: `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(wordText)}`,
        name: "Google TTS",
      },
      // 4. 浏览器 TTS 作为最后手段
      { url: "tts", name: "浏览器TTS" },
    ].filter(Boolean);

    const tryPlayAudio = async (sources: typeof audioSources) => {
      if (sources.length === 0) {
        setIsPlaying(false);
        return;
      }

      const source = sources[0];
      if (!source) {
        setIsPlaying(false);
        return;
      }

      if (source.url === "tts") {
        // 使用浏览器 TTS
        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(wordText);
          utterance.lang = "en-US";
          utterance.rate = 0.8;
          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = () => setIsPlaying(false);
          speechSynthesis.speak(utterance);
          return;
        } else {
          console.error("浏览器不支持语音合成");
          setIsPlaying(false);
          return;
        }
      }

      // 使用在线音频
      try {
        const audio = new Audio(source.url);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = async () => {
          console.warn(`音频源 ${source.name} 失败，尝试下一个...`);
          await tryPlayAudio(sources.slice(1));
        };

        await audio.play();
      } catch (error) {
        console.warn(`音频源 ${source.name} 播放失败，尝试下一个...`);
        await tryPlayAudio(sources.slice(1));
      }
    };

    tryPlayAudio(audioSources).catch((error) => {
      console.error("所有音频源都失败了:", error);
      setIsPlaying(false);
    });
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = trainingData?.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const answer = currentQuestion.type === "output" ? outputText : selectedAnswer;
    if (!answer) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/whitelist/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId,
          questionId: currentQuestion.id,
          answer,
          stage: currentStage,
          correctAnswer: currentQuestion.correctAnswer,
        }),
      });

      const data = await res.json();
      setFeedback({
        show: true,
        isCorrect: data.isCorrect,
        message: data.feedback,
      });

      if (data.isCorrect) {
        // 标记当前阶段完成
        setTimeout(() => {
          nextQuestion();
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    const totalQuestions = trainingData?.questions.length || 0;

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer("");
      setOutputText("");
      setFeedback({ show: false, isCorrect: false, message: "" });
    } else {
      // 完成当前阶段
      const newCompleted = new Set(completedStages);
      newCompleted.add(currentStage);
      setCompletedStages(newCompleted);

      if (currentStage < 3) {
        // 进入下一阶段
        setCurrentStage((currentStage + 1) as Stage);
      } else {
        // 全部完成
        router.push(`/app/chat/${wordId}`);
      }
    }
  };

  const skipQuestion = () => {
    nextQuestion();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
      </div>
    );
  }

  const currentQuestion = trainingData?.questions[currentQuestionIndex];
  const progress = trainingData
    ? ((currentQuestionIndex + 1) / trainingData.questions.length) * 100
    : 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h1 className="text-lg font-semibold">
            {word?.word} 强化训练
          </h1>
          <p className="text-xs text-foreground/60">
            {STAGE_NAMES[currentStage]}
          </p>
        </div>
        <div className="w-9" />
      </header>

      {/* Stage Progress */}
      <div className="px-4 py-3 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1">
            {[1, 2, 3].map((stage) => (
              <div
                key={stage}
                className={cn(
                  "w-8 h-1 rounded-full transition-colors",
                  completedStages.has(stage) || currentStage === stage
                    ? STAGE_COLORS[stage as keyof typeof STAGE_COLORS]
                    : "bg-muted"
                )}
              />
            ))}
          </div>
          <span className="text-xs text-foreground/60">
            阶段 {currentStage}/3
          </span>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Content */}
      {submitting && !feedback.show ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
        </div>
      ) : currentQuestion ? (
        <div className="flex-1 overflow-auto p-4">
          {/* Question Card */}
          <div className="bg-card border border-border rounded-2xl p-6">
            {/* Question */}
            <div className="mb-6">
              <p className="text-lg font-medium mb-2">{currentQuestion.question}</p>
              {currentQuestion.sentence && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-foreground/80">
                    {currentQuestion.sentence}
                  </p>
                </div>
              )}
              {currentQuestion.hint && (
                <p className="text-xs text-foreground/60 mt-2">
                  💡 {currentQuestion.hint}
                </p>
              )}
            </div>

            {/* Audio Button */}
            {currentQuestion.audioUrl && (
              <button
                onClick={() => currentQuestion.audioUrl && playAudio(currentQuestion.audioUrl)}
                className={cn(
                  "mb-6 w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                  isPlaying
                    ? "bg-primary/30"
                    : "bg-primary/10 hover:bg-primary/20"
                )}
                disabled={isPlaying}
              >
                <Volume2 className={cn(
                  "w-6 h-6 text-primary",
                  isPlaying && "animate-pulse"
                )} />
              </button>
            )}

            {/* Answer Options */}
            {currentQuestion.type === "choice" ||
            currentQuestion.type === "listening" ? (
              <div className="space-y-2">
                {currentQuestion.options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(option.text)}
                    className={cn(
                      "w-full p-4 text-left rounded-xl border-2 transition-colors",
                      selectedAnswer === option.text
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            ) : currentQuestion.type === "fillblanks" ? (
              currentQuestion.options ? (
                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedAnswer(option.text)}
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-2 transition-colors",
                        selectedAnswer === option.text
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="输入答案..."
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )
            ) : currentQuestion.type === "output" ? (
              <div className="space-y-4">
                {/* Topic Selection */}
                {currentQuestion.topics && (
                  <div>
                    <p className="text-sm text-foreground/60 mb-2">选择话题（可选）</p>
                    <div className="flex flex-wrap gap-2">
                      {currentQuestion.topics.map((topic) => (
                        <button
                          key={topic}
                          onClick={() => setSelectedTopic(topic)}
                          className={cn(
                            "px-3 py-1 rounded-full text-sm transition-colors",
                            selectedTopic === topic
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text Input */}
                <textarea
                  value={outputText}
                  onChange={(e) => setOutputText(e.target.value)}
                  placeholder="输入你的句子..."
                  rows={4}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            ) : null}

            {/* Feedback */}
            {feedback.show && (
              <div
                className={cn(
                  "mt-4 p-4 rounded-xl flex items-start gap-3",
                  feedback.isCorrect
                    ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                    : "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400"
                )}
              >
                {feedback.isCorrect ? (
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm">{feedback.message}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
        </div>
      )}

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border">
        {feedback.show && feedback.isCorrect ? (
          <Button onClick={nextQuestion} className="w-full h-12 text-base">
            {currentStage < 3 ? "下一关" : "完成训练"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={skipQuestion}
              className="flex-1"
              disabled={submitting}
            >
              跳过
            </Button>
            <Button
              onClick={handleSubmitAnswer}
              className="flex-1"
              disabled={
                submitting ||
                !selectedAnswer ||
                (currentQuestion?.type === "output" && !outputText.trim())
              }
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "提交"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {completedStages.size === 3 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">训练完成！</h2>
            <p className="text-foreground/60 mb-4">
              恭喜！你已完成"{word?.word}"的强化训练！
            </p>
            <Button onClick={() => router.push(`/app/chat/${wordId}`)}>
              进入聊天
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
