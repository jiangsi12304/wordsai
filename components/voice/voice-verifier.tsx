"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, ChevronLeft, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VoiceVerifierProps {
  word: string;
  pronunciation?: string;
  onPass: () => void;
  onFail: () => void;
  onBack: () => void;
}

// 声明 Web Speech API 类型
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// 检测是否为移动设备
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
};

// 检测是否为 iOS
const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// 检测浏览器支持
const checkSpeechRecognitionSupport = (): { supported: boolean; message: string } => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return {
      supported: false,
      message: isIOS()
        ? "iOS 设备：请使用 Safari 浏览器"
        : "您的浏览器不支持语音识别，请使用 Chrome 或 Safari"
    };
  }

  if (isMobileDevice() && !navigator.mediaDevices) {
    return {
      supported: false,
      message: "无法访问麦克风，请确保在 HTTPS 环境下使用"
    };
  }

  return { supported: true, message: "" };
};

export function VoiceVerifier({
  word,
  pronunciation,
  onPass,
  onFail,
  onBack,
}: VoiceVerifierProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopRequestedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasResultRef = useRef(false); // 跟踪是否已获得识别结果

  // 初始化
  useEffect(() => {
    setIsMobile(isMobileDevice());
    playPronunciation();

    // 检查支持
    const support = checkSpeechRecognitionSupport();
    if (!support.supported) {
      setErrorMessage(support.message);
      setShowResult(true);
    } else {
      initSpeechRecognition();
    }

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // 忽略
      }
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  // 播放标准发音
  const playPronunciation = () => {
    setHasPlayed(true);
    setIsPlaying(true);

    if ("speechSynthesis" in window) {
      // 取消之前的播放
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      utterance.pitch = 1;

      utterance.onstart = () => {
        // 开始播放
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = (e) => {
        // interrupted 和 canceled 是正常情况（取消之前的播放），不需要降级
        if (e.error === 'interrupted' || e.error === 'canceled') {
          // 静默处理，不显示错误
          setIsPlaying(false);
          return;
        }
        // 只有真正的错误才显示并降级到在线 TTS
        console.error("Speech synthesis error:", e);
        setIsPlaying(false);
        playOnlineTTS();
      };

      // iOS 需要延迟播放
      setTimeout(() => {
        speechSynthesis.speak(utterance);
      }, 100);
    } else {
      playOnlineTTS();
    }
  };

  // 在线 TTS 备选方案
  const playOnlineTTS = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(
        `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`
      );
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    }
    audioRef.current.play().catch(() => setIsPlaying(false));
  };

  // 初始化语音识别
  const initSpeechRecognition = () => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    // 移动端优化
    if (isMobileDevice()) {
      // 移动端可能需要更长的超时
      recognition.maxAlternatives = 1;
    }

    recognition.onstart = () => {
      setIsRecognizing(true);
      setIsRecording(true);
      console.log("[SpeechRecognition] Started");

      // 设置超时（移动端 8 秒，桌面 5 秒）
      const timeout = isMobileDevice() ? 8000 : 5000;
      timeoutRef.current = setTimeout(() => {
        if (isRecognizing) {
          console.log("[SpeechRecognition] Timeout, stopping...");
          try {
            recognition.stop();
          } catch (e) {
            // 忽略
          }
        }
      }, timeout);
    };

    recognition.onresult = (event: any) => {
      const results = event.results;
      if (results && results.length > 0) {
        const lastResult = results[results.length - 1];
        if (lastResult && lastResult.length > 0) {
          const transcript = lastResult[0].transcript.toLowerCase().trim();
          console.log("[SpeechRecognition] Result:", transcript);
          setRecognizedText(transcript);
          evaluatePronunciationReal(transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("[SpeechRecognition] Error:", event.error);
      setIsRecording(false);
      setIsRecognizing(false);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 忽略主动停止的错误
      if (event.error === "aborted") {
        return;
      }

      let errorMsg = "";
      switch (event.error) {
        case "no-speech":
          errorMsg = isMobile
            ? "没有检测到语音\n• 请靠近麦克风\n• 在安静环境中使用\n• 清楚地读出单词"
            : "没有检测到语音，请靠近麦克风再试";
          break;
        case "audio-capture":
          errorMsg = isMobile
            ? "无法访问麦克风\n• 请允许麦克风权限\n• 检查系统设置"
            : "无法访问麦克风，请检查权限设置";
          break;
        case "not-allowed":
          errorMsg = "麦克风权限被拒绝，请在浏览器设置中允许";
          break;
        case "network":
          errorMsg = "网络错误，语音识别需要联网";
          break;
        default:
          errorMsg = `识别失败: ${event.error}`;
      }
      setErrorMessage(errorMsg);
      setShowResult(true);
    };

    recognition.onend = () => {
      console.log("[SpeechRecognition] Ended");
      setIsRecording(false);
      setIsRecognizing(false);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 使用 ref 检查是否已获得结果（避免时序问题）
      setTimeout(() => {
        if (!hasResultRef.current && !errorMessage) {
          setErrorMessage(isMobile
            ? "没有检测到有效的语音\n请再试一次"
            : "没有检测到语音，请再试一次");
          setShowResult(true);
        }
      }, 300);
    };

    recognitionRef.current = recognition;
  };

  // 开始录音
  const startRecording = async () => {
    setErrorMessage("");
    setRecognizedText("");
    setShowResult(false);
    setSimilarity(null);
    stopRequestedRef.current = false;
    hasResultRef.current = false; // 重置结果标志

    // 检查支持
    const support = checkSpeechRecognitionSupport();
    if (!support.supported) {
      setErrorMessage(support.message);
      setShowResult(true);
      return;
    }

    // 请求麦克风权限
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 立即停止测试流，只检查权限
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      setErrorMessage(isMobile
        ? "无法访问麦克风\n• 请允许麦克风权限\n• 检查浏览器设置"
        : "无法访问麦克风，请检查权限设置");
      setShowResult(true);
      return;
    }

    // 开始识别
    if (recognitionRef.current) {
      try {
        // 停止之前的识别
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // 忽略
        }

        // 重新创建识别器
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionClass();

        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = isMobile ? 1 : 3;

        // 设置事件（与 initSpeechRecognition 相同）
        recognition.onstart = () => {
          setIsRecognizing(true);
          setIsRecording(true);
          console.log("[SpeechRecognition] Started");

          const timeout = isMobile ? 8000 : 5000;
          timeoutRef.current = setTimeout(() => {
            if (recognitionRef.current === recognition) {
              try {
                recognition.stop();
              } catch (e) {
                // 忽略
              }
            }
          }, timeout);
        };

        recognition.onresult = (event: any) => {
          const results = event.results;
          if (results && results.length > 0) {
            const lastResult = results[results.length - 1];
            if (lastResult && lastResult.length > 0) {
              const transcript = lastResult[0].transcript.toLowerCase().trim();
              console.log("[SpeechRecognition] Result:", transcript);
              setRecognizedText(transcript);
              evaluatePronunciationReal(transcript);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.error("[SpeechRecognition] Error:", event.error);
          setIsRecording(false);
          setIsRecognizing(false);

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          if (event.error === "aborted") return;

          let errorMsg = "";
          switch (event.error) {
            case "no-speech":
              errorMsg = isMobile
                ? "没有检测到语音\n• 请靠近麦克风\n• 在安静环境中使用"
                : "没有检测到语音，请靠近麦克风再试";
              break;
            case "audio-capture":
              errorMsg = "无法访问麦克风，请检查权限设置";
              break;
            case "not-allowed":
              errorMsg = "麦克风权限被拒绝，请在浏览器设置中允许";
              break;
            case "network":
              errorMsg = "网络错误，语音识别需要联网";
              break;
            default:
              errorMsg = `识别失败: ${event.error}`;
          }
          setErrorMessage(errorMsg);
          setShowResult(true);
        };

        recognition.onend = () => {
          console.log("[SpeechRecognition] Ended");
          setIsRecording(false);
          setIsRecognizing(false);

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          // 使用 ref 检查是否已获得结果
          setTimeout(() => {
            if (!hasResultRef.current && !errorMessage) {
              setErrorMessage("没有检测到语音，请再试一次");
              setShowResult(true);
            }
          }, 300);
        };

        recognitionRef.current = recognition;

        // iOS 需要延迟启动
        setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            console.error("Failed to start recognition:", error);
            setErrorMessage("启动失败，请重试");
            setShowResult(true);
          }
        }, isIOS() ? 100 : 0);

      } catch (error) {
        console.error("Failed to setup recognition:", error);
        setErrorMessage("启动失败，请重试");
        setShowResult(true);
      }
    }
  };

  // 真实的发音评估
  const evaluatePronunciationReal = (transcript: string) => {
    const targetWord = word.toLowerCase().trim();
    const recognized = transcript.toLowerCase().trim();

    let similarityScore = 0;

    // 完全匹配
    if (recognized === targetWord) {
      similarityScore = 100;
    }
    // 识别结果包含目标词
    else if (recognized.includes(targetWord)) {
      similarityScore = 85;
    }
    // 目标词包含在识别结果中
    else if (targetWord.includes(recognized) && recognized.length > 2) {
      similarityScore = 60;
    }
    // 计算编辑距离相似度
    else {
      similarityScore = Math.floor(calculateLevenshteinSimilarity(targetWord, recognized) * 100);
    }

    setSimilarity(similarityScore);
    setShowResult(true);
    hasResultRef.current = true; // 标记已获得结果
  };

  // 计算编辑距离相似度
  const calculateLevenshteinSimilarity = (s1: string, s2: string): number => {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // 编辑距离算法
  const levenshteinDistance = (s1: string, s2: string): number => {
    const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(0));

    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[s2.length][s1.length];
  };

  const handleResultConfirm = (passed: boolean) => {
    if (passed) {
      onPass();
    } else {
      onFail();
    }
  };

  const handleRetry = () => {
    setSimilarity(null);
    setShowResult(false);
    setErrorMessage("");
    setRecognizedText("");
    hasResultRef.current = false; // 重置结果标志
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">语音验证</h1>
        <div className="w-9" />
      </header>

      {/* Mobile Notice */}
      {isMobile && !showResult && (
        <div className="mx-4 mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg flex items-start gap-2">
          <Smartphone className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            请在安静环境中使用，靠近麦克风清楚地读出单词
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Word Display */}
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold mb-2">{word}</h2>
          {pronunciation && (
            <p className="text-muted-foreground text-sm">{pronunciation}</p>
          )}
        </div>

        {/* Play Button */}
        <button
          onClick={playPronunciation}
          className="mb-8 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors active:scale-95"
          disabled={isPlaying}
        >
          {isPlaying ? (
            <Volume2 className="w-8 h-8 text-primary animate-pulse" />
          ) : (
            <VolumeX className="w-8 h-8 text-primary" />
          )}
        </button>

        {/* Recording Button */}
        {!showResult && (
          <div className="flex flex-col items-center w-full max-w-xs">
            {isRecognizing ? (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full bg-red-500 flex items-center justify-center">
                    <Mic className="w-14 h-14 text-white" />
                  </div>
                  {/* 声波动画 */}
                  <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-50" />
                  <div className="absolute -inset-2 rounded-full border-2 border-red-300 animate-ping opacity-30" style={{ animationDelay: '0.15s' }} />
                </div>
                <p className="mt-6 text-foreground font-medium">正在听你说...</p>
                <p className="text-sm text-foreground/60 mt-1">请清楚地读出这个单词</p>
              </div>
            ) : (
              <>
                <button
                  onClick={startRecording}
                  className={cn(
                    "w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
                    "bg-primary hover:bg-primary/90 active:scale-95"
                  )}
                >
                  <Mic className="w-14 h-14 text-primary-foreground" />
                </button>
                <p className="mt-6 text-foreground font-medium">
                  {hasPlayed ? "点击开始跟读" : "先听发音，再点击跟读"}
                </p>
                <p className="text-sm text-foreground/60 mt-1">
                  {isMobile ? "读完会自动停止" : "说完后自动停止识别"}
                </p>
              </>
            )}
          </div>
        )}

        {/* Result */}
        {showResult && (
          <div className="w-full max-w-sm">
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              {errorMessage ? (
                <>
                  <p className="text-red-500 mb-4 whitespace-pre-line text-sm">{errorMessage}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleRetry}
                      className="flex-1"
                    >
                      重试
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleResultConfirm(false)}
                      className="flex-1"
                    >
                      跳过
                    </Button>
                  </div>
                </>
              ) : similarity !== null ? (
                <>
                  <p className="text-muted-foreground mb-2">发音相似度</p>
                  <p
                    className={cn(
                      "text-5xl font-bold mb-4",
                      similarity >= 70 ? "text-green-500" : "text-orange-500"
                    )}
                  >
                    {similarity}%
                  </p>

                  <Progress value={similarity} className="mb-4" />

                  {recognizedText && (
                    <div className="mb-4 p-3 bg-muted rounded-lg">
                      <p className="text-xs text-foreground/60 mb-1">系统识别:</p>
                      <p className="text-sm font-medium">"{recognizedText}"</p>
                      {recognizedText.toLowerCase() !== word.toLowerCase() && (
                        <p className="text-xs text-foreground/60 mt-1">
                          目标: "{word}"
                        </p>
                      )}
                    </div>
                  )}

                  {similarity >= 70 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {similarity >= 90 ? "太棒了！发音很标准" : "不错！继续努力"}
                      </p>
                      <Button onClick={() => handleResultConfirm(true)} className="w-full">
                        进入聊天
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {similarity >= 50
                          ? "发音不太准确，再试一次"
                          : "没有识别到正确发音，请听清楚后再试"}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleRetry}
                          className="flex-1"
                        >
                          重试
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleResultConfirm(false)}
                          className="flex-1"
                        >
                          跳过学习
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">正在分析...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
