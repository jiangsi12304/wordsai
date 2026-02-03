import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * 骨架屏加载组件
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/**
 * 消息列表项骨架屏
 */
export function WordChatItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-border">
      {/* Avatar */}
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-3 w-12 rounded" />
        </div>
        <Skeleton className="h-3 w-48 rounded" />
      </div>

      {/* Mastery indicator */}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="w-1 h-3 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * 页面骨架屏
 */
export function PageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Skeleton className="h-6 w-20 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <WordChatItemSkeleton key={i} />
        ))}
      </div>

      {/* Bottom Nav */}
      <div className="h-16 border-t border-border flex items-center justify-around px-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 统计卡片骨架屏
 */
export function StatsCardSkeleton() {
  return (
    <div className="bg-muted/30 rounded-xl p-4 space-y-4">
      <div className="flex justify-around">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/**
 * 单词卡片骨架屏（白名单）
 */
export function WordCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <Skeleton className="h-6 w-24 mb-2" />
      <Skeleton className="h-2 w-full mb-4" />
      <Skeleton className="h-2 w-3/4 mb-4" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

/**
 * 私聊页面骨架屏
 */
export function ChatPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Skeleton className="w-5 h-5" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-5 h-5" />
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-16 w-48 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="flex-1 h-10 rounded-full" />
          <Skeleton className="w-16 h-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
