"use client";

import { Lightbulb, PenTool, Scale, FileEdit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface AIExpansionPanelProps {
  word: string;
  wordId?: string;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, params?: any) => void;
}

export function AIExpansionPanel({
  word,
  wordId,
  isOpen,
  onClose,
  onAction,
}: AIExpansionPanelProps) {
  const [showTopicInput, setShowTopicInput] = useState(false);
  const [topic, setTopic] = useState("");

  const actions = [
    {
      id: "memory-tips",
      icon: Lightbulb,
      label: "记忆技巧",
      description: "获取记忆方法",
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    {
      id: "sentence",
      icon: PenTool,
      label: "造句",
      description: "生成例句",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      id: "compare",
      icon: Scale,
      label: "比较",
      description: "近义词辨析",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    },
    {
      id: "handwriting",
      icon: FileEdit,
      label: "手写",
      description: "手写练习",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
  ];

  if (!isOpen) return null;

  const handleAction = (actionId: string) => {
    if (actionId === "sentence") {
      setShowTopicInput(true);
    } else if (actionId === "handwriting") {
      // 导航到手写页面
      if (wordId) {
        window.location.href = `/app/handwriting/${wordId}`;
      }
      onClose();
    } else {
      onAction(actionId);
    }
  };

  const handleSentenceSubmit = () => {
    onAction("sentence", { topic });
    setShowTopicInput(false);
    setTopic("");
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl p-6 animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">AI 助手</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Topic Input (for sentence) */}
        {showTopicInput ? (
          <div className="mb-4">
            <label className="text-sm text-foreground/60 mb-2 block">
              选择或输入话题（可选）
            </label>
            <div className="flex gap-2 mb-2">
              {["旅行", "工作", "学习", "日常"].map((t) => (
                <Badge
                  key={t}
                  variant={topic === t ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setTopic(t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="或输入其他话题..."
              className="w-full px-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-3"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTopicInput(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button onClick={handleSentenceSubmit} className="flex-1">
                生成
              </Button>
            </div>
          </div>
        ) : (
          /* Grid Actions */
          <div className="grid grid-cols-2 gap-4">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-2xl hover:bg-muted transition-colors"
                >
                  <div className={`w-14 h-14 rounded-full ${action.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="font-medium mb-1">{action.label}</span>
                  <span className="text-xs text-foreground/60">
                    {action.description}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Compare Input */}
        {false && (
          <div className="mt-4 pt-4 border-t border-border">
            <label className="text-sm text-foreground/60 mb-2 block">
              输入要比较的单词
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="如: vague, obscure..."
                className="flex-1 px-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button>比较</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// 预设的AI指令
export const AI_PROMPTS = {
  memoryTips: (word: string) =>
    `请给我分享一些记忆单词 "${word}" 的技巧，包括词根词缀法、联想法、谐音法等。`,

  sentence: (word: string, topic?: string) =>
    topic
      ? `请用单词 "${word}" 造一个关于"${topic}"的句子，并给出中文翻译。`
      : `请用单词 "${word}" 造几个例句，并给出中文翻译。`,

  compare: (word: string, compareWord: string) =>
    `请帮我辨析单词 "${word}" 和 "${compareWord}" 的区别，包括用法、语境等。`,

  handwriting: (word: string) =>
    `我想练习手写单词 "${word}"，请告诉我书写时需要注意的地方。`,
};
