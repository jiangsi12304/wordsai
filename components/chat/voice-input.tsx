"use client";

import React, { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInput({ onTranscript, disabled = false, className = "" }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 开始录音
  const startRecording = useCallback(() => {
    if (disabled) return;

    setIsRecording(true);
    setRecordingTime(0);

    // 计时器
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    // TODO: 实际的录音逻辑
    // 这里需要集成浏览器 Web Speech API 或第三方语音识别服务
    // const recognition = new (window as any).webkitSpeechRecognition();
    // recognition.onresult = (event: any) => {
    //   const transcript = event.results[0][0].transcript;
    //   onTranscript(transcript);
    // };
    // recognition.start();
  }, [disabled, onTranscript]);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsRecording(false);
    setIsProcessing(true);

    // TODO: 停止录音并处理结果
    // 模拟处理延迟
    setTimeout(() => {
      setIsProcessing(false);
      setRecordingTime(0);
    }, 500);
  }, []);

  // 处理点击/触摸
  const handleToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // 格式化录音时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <button
      onClick={handleToggle}
      disabled={disabled || isProcessing}
      className={`relative flex items-center justify-center transition-colors ${
        isRecording
          ? "bg-red-500 text-white hover:bg-red-600"
          : "text-foreground/60 hover:text-foreground hover:bg-muted"
      } ${disabled || isProcessing ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {isProcessing ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isRecording ? (
        <div className="flex items-center gap-2">
          <MicOff className="w-5 h-5" />
          <span className="text-xs font-mono">{formatTime(recordingTime)}</span>
        </div>
      ) : (
        <Mic className="w-5 h-5" />
      )}

      {/* 录音波形动画 */}
      {isRecording && (
        <div className="absolute inset-0 flex items-center justify-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-0.5 bg-current animate-pulse"
              style={{
                height: `${10 + Math.random() * 10}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}
    </button>
  );
}

// 简化的语音按钮（用于聊天输入框）
interface VoiceButtonProps {
  onToggleRecording: () => void;
  isRecording: boolean;
  recordingTime?: number;
  disabled?: boolean;
}

export function VoiceButton({
  onToggleRecording,
  isRecording,
  recordingTime = 0,
  disabled = false,
}: VoiceButtonProps) {
  return (
    <button
      onClick={onToggleRecording}
      disabled={disabled}
      className={`p-2 rounded-full transition-colors ${
        isRecording
          ? "bg-red-500 text-white hover:bg-red-600"
          : "text-foreground/60 hover:text-foreground hover:bg-muted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isRecording ? (
        <div className="flex items-center gap-1">
          <MicOff className="w-4 h-4" />
          <span className="text-xs font-mono">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}</span>
        </div>
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}
