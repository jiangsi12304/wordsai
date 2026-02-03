"use client";

import React, { useRef, useEffect } from "react";
import { Volume2, Loader2, BookOpen } from "lucide-react";

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  content: string;
  created_at: string;
  message_type?: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
  word?: string;
  aiName?: string;
}

interface WordInfo {
  word: string;
  found: boolean;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  chinese: string;
  example: string;
  audio_url?: string;
  definitions: Array<{
    partOfSpeech: string;
    definition: string;
    chinese: string;
    example: string;
  }>;
}

// 单词信息浮层组件
function WordTooltip({ word, children }: { word: string; children: React.ReactNode }) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [wordInfo, setWordInfo] = React.useState<WordInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0, align: 'center' as 'left' | 'center' | 'right' });
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const fetchWordInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`);
      const data = await res.json();
      setWordInfo(data);
    } catch (error) {
      console.error("Failed to fetch word info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (!showTooltip && !wordInfo) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const tooltipWidth = 256; // w-64 = 16rem = 256px
        const margin = 8; // 边缘间距

        // 计算对齐方式，防止超出屏幕
        let align: 'left' | 'center' | 'right' = 'center';
        let left = rect.left + rect.width / 2;

        // 如果靠左边，使用左对齐
        if (rect.left < tooltipWidth / 2 + margin) {
          align = 'left';
          left = rect.left;
        }
        // 如果靠右边，使用右对齐
        else if (rect.left > window.innerWidth - tooltipWidth / 2 - margin) {
          align = 'right';
          left = rect.left + rect.width;
        }

        setPosition({
          top: rect.top - 10,
          left: left,
          align,
        });
      }
      setShowTooltip(true);
      fetchWordInfo();
    } else if (wordInfo) {
      setShowTooltip(true);
    }
  };

  const playPronunciation = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 优先使用 audio_url
    if (wordInfo?.audio_url) {
      const audio = new Audio(wordInfo.audio_url);
      audio.play().catch(() => {
        // 如果在线音频失败，降级到 TTS
        playTTS(word);
      });
    } else {
      playTTS(word);
    }
  };

  const playTTS = (wordToSpeak: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(wordToSpeak);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <span
      ref={containerRef}
      className="relative inline cursor-pointer border-b border-dotted border-foreground/40 hover:border-foreground hover:text-primary transition-colors"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-64 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg border border-border p-3"
          style={{
            top: `${position.top - 8}px`,
            left: `${position.left}px`,
            transform: position.align === 'center'
              ? "translateX(-50%) translateY(-100%)"
              : position.align === 'left'
                ? "translateY(-100%)"
                : "translateX(-100%) translateY(-100%)",
          }}
        >
          {/* 单词标题栏 */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
            <span className="font-bold text-base">{word}</span>
            {wordInfo?.pronunciation && (
              <span className="text-xs text-muted-foreground">/{wordInfo.pronunciation}/</span>
            )}
          </div>

          {/* 内容区域 */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : wordInfo?.found ? (
            <div className="space-y-2">
              {/* 词性 */}
              {wordInfo.partOfSpeech && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                    {wordInfo.partOfSpeech}
                  </span>
                </div>
              )}

              {/* 中文释义 */}
              {wordInfo.chinese && (
                <div>
                  <p className="text-sm font-medium text-primary">{wordInfo.chinese}</p>
                </div>
              )}

              {/* 英文释义 */}
              {wordInfo.definition && (
                <div>
                  <p className="text-xs text-muted-foreground">{wordInfo.definition}</p>
                </div>
              )}

              {/* 例句 */}
              {wordInfo.example && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-muted-foreground">例句</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">"{wordInfo.example}"</p>
                </div>
              )}

              {/* 发音按钮 */}
              <button
                onClick={playPronunciation}
                className="flex items-center gap-2 w-full py-2 px-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-primary text-xs font-medium mt-2"
              >
                <Volume2 className="w-4 h-4" />
                播放发音
              </button>
            </div>
          ) : (
            <div className="py-2 text-center text-muted-foreground text-xs">
              未找到单词信息
            </div>
          )}

          {/* 箭头 */}
          <div className={`absolute top-full -mt-px ${
            position.align === 'center'
              ? 'left-1/2 -translate-x-1/2'
              : position.align === 'left'
                ? 'left-8'
                : 'right-8'
          }`}>
            <div className="border-4 border-transparent border-t-popover" />
          </div>
        </div>
      )}
    </span>
  );
}

// 简单的组件，用于高亮消息中的英文单词
function highlightWords(text: string) {
  // 匹配英文单词的正则
  const wordRegex = /\b[a-zA-Z]{3,}\b/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = wordRegex.exec(text)) !== null) {
    // 添加匹配前的文本
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // 添加高亮的单词
    parts.push(
      <WordTooltip key={match.index} word={match[0]}>
        {match[0]}
      </WordTooltip>
    );
    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

export function MessageBubble({ message, word, aiName }: MessageBubbleProps) {
  const isAi = message.sender === "ai";

  return (
    <div className={`flex gap-3 ${isAi ? "" : "flex-row-reverse"}`}>
      {/* 头像 */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium ${
          isAi ? "bg-primary/10 text-primary" : "bg-muted text-foreground/60"
        }`}
      >
        {isAi ? (aiName || word || "AI").charAt(0).toUpperCase() : "我"}
      </div>

      {/* 消息气泡 */}
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isAi
            ? "bg-muted rounded-tl-none"
            : "bg-primary text-primary-foreground rounded-tr-none"
        }`}
      >
        {/* AI 名称（仅 AI 消息） */}
        {isAi && aiName && (
          <p className="text-xs text-foreground/60 mb-1">{aiName}</p>
        )}

        {/* 消息内容 */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {isAi ? highlightWords(message.content) : message.content}
        </div>

        {/* 时间戳 */}
        <p
          className={`text-xs mt-1 ${
            isAi ? "text-foreground/40" : "text-primary-foreground/60"
          }`}
        >
          {new Date(message.created_at).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
