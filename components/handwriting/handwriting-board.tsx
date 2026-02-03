"use client";

import { useRef, useState, useEffect } from "react";
import SignaturePad from "react-signature-pad";
import {
  X,
  Check,
  Undo2,
  Redo2,
  Trash2,
  Eraser,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HandwritingBoardProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  word?: string;
}

type ToolType = "pen" | "eraser";
type ColorType = "black" | "red" | "blue";

export function HandwritingBoard({
  onSave,
  onCancel,
  word,
}: HandwritingBoardProps) {
  const signaturePadRef = useRef<SignaturePad>(null);
  const [tool, setTool] = useState<ToolType>("pen");
  const [color, setColor] = useState<ColorType>("black");
  const [lineWidth, setLineWidth] = useState(2);

  // 历史记录（用于撤销/重做）
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 保存当前状态到历史记录
  const saveToHistory = () => {
    if (!signaturePadRef.current) return;

    const dataUrl = signaturePadRef.current.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 笔刷配置
  const brushConfig = {
    black: { color: "rgb(0, 0, 0)", eraser: false },
    red: { color: "rgb(239, 68, 68)", eraser: false },
    blue: { color: "rgb(59, 130, 246)", eraser: false },
  };

  useEffect(() => {
    // 初始化设置
    if (signaturePadRef.current) {
      const pad = signaturePadRef.current;
      pad.penColor = brushConfig[color].color;
      pad.minWidth = lineWidth;
      pad.maxWidth = lineWidth + 2;
    }
  }, [color, lineWidth, tool]);

  // 开始绘制时保存历史
  const handleBegin = () => {
    // 在开始新笔画前保存当前状态
    if (historyIndex === -1 || historyIndex < history.length - 1) {
      const dataUrl = signaturePadRef.current?.toDataURL();
      if (dataUrl) {
        setHistory([dataUrl]);
        setHistoryIndex(0);
      }
    }
  };

  // 结束绘制后保存历史
  const handleEnd = () => {
    saveToHistory();
  };

  // 清空画布
  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setHistory([]);
      setHistoryIndex(-1);
    }
  };

  // 撤销
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      signaturePadRef.current?.fromDataURL(history[newIndex]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      signaturePadRef.current?.clear();
    }
  };

  // 重做
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      signaturePadRef.current?.fromDataURL(history[newIndex]);
    }
  };

  // 保存
  const handleSave = () => {
    if (signaturePadRef.current) {
      const dataUrl = signaturePadRef.current.toDataURL();
      onSave(dataUrl);
    }
  };

  const lineWidths = [1, 2, 3];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h1 className="text-lg font-semibold">手写练习</h1>
          {word && <p className="text-xs text-foreground/60">单词: {word}</p>}
        </div>
        <Button onClick={handleSave} size="icon">
          <Check className="w-5 h-5" />
        </Button>
      </header>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-white dark:bg-zinc-900">
        <div className="absolute inset-4 border-2 border-dashed border-border rounded-lg">
          <SignaturePad
            ref={signaturePadRef}
            canvasProps={{
              className: "w-full h-full",
            }}
            onBegin={handleBegin}
            onEnd={handleEnd}
          />
        </div>

        {/* 模格线背景 */}
        <div className="pointer-events-none absolute inset-4 flex flex-col">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 border-b border-blue-200 dark:border-blue-900/30" />
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-t border-border bg-background">
        {/* Tool Selection */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* 工具选择 */}
          <div className="flex gap-2">
            <button
              onClick={() => setTool("pen")}
              className={cn(
                "p-3 rounded-lg transition-colors",
                tool === "pen"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={cn(
                "p-3 rounded-lg transition-colors",
                tool === "eraser"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <Eraser className="w-5 h-5" />
            </button>
          </div>

          {/* 分隔线 */}
          <div className="w-px h-8 bg-border" />

          {/* 颜色选择（仅笔刷模式） */}
          {tool === "pen" && (
            <div className="flex gap-2">
              {(["black", "red", "blue"] as ColorType[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 transition-all",
                    color === c
                      ? "border-primary scale-110"
                      : "border-border hover:border-primary/50"
                  )}
                  style={{
                    backgroundColor:
                      c === "black"
                        ? "#000"
                        : c === "red"
                        ? "#ef4444"
                        : "#3b82f6",
                  }}
                />
              ))}
            </div>
          )}

          {/* 分隔线 */}
          <div className="w-px h-8 bg-border" />

          {/* 粗细选择（仅笔刷模式） */}
          {tool === "pen" && (
            <div className="flex gap-2">
              {lineWidths.map((w) => (
                <button
                  key={w}
                  onClick={() => setLineWidth(w)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                    lineWidth === w
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <div
                    className="rounded-full bg-current"
                    style={{ width: w * 4, height: w * 4 }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleUndo}
            disabled={historyIndex === -1}
          >
            <Undo2 className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
          >
            <Redo2 className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleClear}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
