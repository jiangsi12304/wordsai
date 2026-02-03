"use client";

import React, { useRef, useState, useCallback } from "react";
import { ChevronLeft, Check, X } from "lucide-react";

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon?: React.ReactNode;
    label: string;
    color: string;
  };
  rightAction?: {
    icon?: React.ReactNode;
    label: string;
    color: string;
  };
  swipeThreshold?: number;
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = { icon: <X className="w-5 h-5" />, label: "忘记了", color: "bg-red-500" },
  rightAction = { icon: <Check className="w-5 h-5" />, label: "记住了", color: "bg-green-500" },
  swipeThreshold = 100,
  className = "",
}: SwipeableCardProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startTime = useRef(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (isTransitioning) return;
      setIsDragging(true);
      startTime.current = Date.now();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      startX.current = clientX - dragX;
    },
    [dragX, isTransitioning]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDragging || isTransitioning) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const newX = clientX - startX.current;

      // 限制滑动范围
      const maxSwipe = 150;
      const clampedX = Math.max(-maxSwipe, Math.min(maxSwipe, newX));
      setDragX(clampedX);
    },
    [isDragging, isTransitioning, startX]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || isTransitioning) return;

    const duration = Date.now() - startTime.current;
    const velocity = Math.abs(dragX) / duration;

    setIsDragging(false);

    // 检查是否超过阈值或速度够快
    if (dragX > swipeThreshold || (dragX > 50 && velocity > 0.5)) {
      // 右滑 - 记住了
      setIsTransitioning(true);
      setDragX(500); // 滑出屏幕
      setTimeout(() => {
        onSwipeRight?.();
        resetCard();
      }, 200);
    } else if (dragX < -swipeThreshold || (dragX < -50 && velocity > 0.5)) {
      // 左滑 - 忘记了
      setIsTransitioning(true);
      setDragX(-500); // 滑出屏幕
      setTimeout(() => {
        onSwipeLeft?.();
        resetCard();
      }, 200);
    } else {
      // 回弹
      setDragX(0);
    }
  }, [dragX, isDragging, isTransitioning, swipeThreshold, onSwipeLeft, onSwipeRight, startX, startTime]);

  const resetCard = useCallback(() => {
    setDragX(0);
    setIsTransitioning(false);
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 左侧动作背景（右滑时显示） */}
      {onSwipeRight && (
        <div
          className={`absolute inset-y-0 left-0 ${rightAction.color} text-white flex items-center justify-end pr-6 transition-transform duration-200`}
          style={{
            transform: `translateX(${Math.max(0, dragX)}px)`,
            width: "100%",
          }}
        >
          <div className="flex items-center gap-2">
            {rightAction.icon}
            <span className="font-medium">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* 右侧动作背景（左滑时显示） */}
      {onSwipeLeft && (
        <div
          className={`absolute inset-y-0 right-0 ${leftAction.color} text-white flex items-center justify-start pl-6 transition-transform duration-200`}
          style={{
            transform: `translateX(${Math.min(0, dragX)}px)`,
            width: "100%",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{leftAction.label}</span>
            {leftAction.icon}
          </div>
        </div>
      )}

      {/* 卡片内容 */}
      <div
        ref={cardRef}
        className={`relative bg-background ${isTransitioning ? "transition-transform duration-200" : ""}`}
        style={{
          transform: `translateX(${dragX}px)`,
          touchAction: "pan-y", // 允许垂直滚动
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// 简化版 - 单词聊天项组件
export interface WordChatItemData {
  id: string;
  word: string;
  aiName?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  masteryLevel?: number;
}

interface WordChatItemProps {
  word: WordChatItemData;
  onClick: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function WordChatItem({
  word,
  onClick,
  onSwipeLeft,
  onSwipeRight,
}: WordChatItemProps) {
  // 获取单词首字母作为头像
  const firstLetter = word.word.charAt(0).toUpperCase();

  // 根据掌握度获取颜色
  const getMasteryColor = (level?: number) => {
    if (!level || level === 0) return "bg-gray-500";
    if (level <= 1) return "bg-red-500";
    if (level <= 2) return "bg-orange-500";
    if (level <= 3) return "bg-yellow-500";
    if (level <= 4) return "bg-lime-500";
    return "bg-green-500";
  };

  const [isDragging, setIsDragging] = useState(false);
  const startX = useState(0)[0];
  const currentX = useState(0)[0];

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDragging(false);
    // 如果没有显著滑动，触发点击
    const dragDistance = Math.abs(currentX - startX);
    if (dragDistance < 10) {
      onClick();
    }
  };

  return (
    <SwipeableCard
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
      className="border-b border-border"
    >
      <div
        className="flex items-center gap-3 p-4 bg-background hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={onClick}
      >
        {/* 头像 */}
        <div className={`relative flex-shrink-0`}>
          <div
            className={`w-12 h-12 rounded-full ${getMasteryColor(word.masteryLevel)} text-white flex items-center justify-center text-lg font-semibold`}
          >
            {firstLetter}
          </div>
          {/* 未读红点 */}
          {word.unreadCount && word.unreadCount > 0 ? (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {word.unreadCount > 9 ? "9+" : word.unreadCount}
            </div>
          ) : null}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate">
              {word.aiName || word.word}
            </h3>
            {word.lastMessageTime && (
              <span className="text-xs text-foreground/60 flex-shrink-0 ml-2">
                {word.lastMessageTime}
              </span>
            )}
          </div>
          {/* 总是显示消息预览，如果没有则显示默认提示 */}
          {word.lastMessage ? (
            <p className="text-sm text-foreground/60 truncate mt-0.5">
              {word.lastMessage}
            </p>
          ) : (
            <p className="text-sm text-foreground/40 truncate mt-0.5 italic">
              点击开始聊天...
            </p>
          )}
        </div>

        {/* 掌握度指示器 */}
        {word.masteryLevel !== undefined && word.masteryLevel > 0 && (
          <div className="flex-shrink-0 ml-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-3 rounded-full ${
                    i < (word.masteryLevel || 0) ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </SwipeableCard>
  );
}
