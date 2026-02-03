"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, MoreVertical, Plus, Send, Loader2, Crown, X } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { MessageBubble, type ChatMessage } from "@/components/chat/message-bubble";
import { AIExpansionPanel, AI_PROMPTS } from "@/components/chat/ai-expansion-panel";

// 扩展的消息类型（包含更多字段）
interface ExtendedChatMessage extends ChatMessage {
  word_id: string;
  is_read: boolean;
}

// 订阅限制提示类型
interface LimitPrompt {
  show: boolean;
  type: "chat" | "words";
  message: string;
  remaining?: number;
}

// 单词信息类型
interface WordInfo {
  id: string;
  word: string;
  ai_name?: string;
  mastery_level?: number;
  definitions?: any;
  is_in_whitelist?: boolean;
}

// 快捷操作类型
interface QuickAction {
  icon: string;
  label: string;
  prompt: string;
}

const quickActions: QuickAction[] = [
  { icon: "💡", label: "记忆技巧", prompt: "请告诉我记住这个单词的技巧" },
  { icon: "✍️", label: "造句", prompt: "请用这个单词造一个句子" },
  { icon: "🔄", label: "近义词", prompt: "这个单词有哪些近义词" },
  { icon: "📚", label: "用法", prompt: "请告诉我这个单词的常见用法" },
];

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const wordId = params.wordId as string;

  const [word, setWord] = useState<WordInfo | null>(null);
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showAIExpansion, setShowAIExpansion] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isGeneratingIntro, setIsGeneratingIntro] = useState(false);
  const [limitPrompt, setLimitPrompt] = useState<LimitPrompt>({ show: false, type: "chat", message: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取单词和聊天历史
  const fetchChatData = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${wordId}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/app");
          return;
        }
        throw new Error("Failed to fetch chat data");
      }
      const data = await res.json();
      setWord(data.word);
      setMessages(data.messages || []);

      // 如果没有聊天记录，自动生成并显示自我介绍
      if ((!data.messages || data.messages.length === 0) && data.word) {
        generateSelfIntro(data.word);
      }
    } catch (error) {
      console.error("Failed to fetch chat:", error);
    } finally {
      setLoading(false);
    }
  }, [wordId, router]);

  // 生成自我介绍
  const generateSelfIntro = async (wordData: WordInfo) => {
    setIsGeneratingIntro(true);
    try {
      const res = await fetch(`/api/chat/${wordId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "", generateIntro: true }),
      });

      if (!res.ok) throw new Error("Failed to generate intro");

      const data = await res.json();
      if (data.aiMessage) {
        setMessages([data.aiMessage]);
      }
    } catch (error) {
      console.error("Failed to generate intro:", error);
    } finally {
      setIsGeneratingIntro(false);
    }
  };

  useEffect(() => {
    if (wordId) {
      fetchChatData();
    }
  }, [wordId, fetchChatData]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 发送消息
  const sendMessage = async (message: string) => {
    if (!message.trim() || sending) return;

    setSending(true);
    setInputValue("");

    // 乐观更新：添加用户消息到列表
    const tempUserMessage: ExtendedChatMessage = {
      id: `temp-${Date.now()}`,
      sender: "user",
      content: message,
      created_at: new Date().toISOString(),
      word_id: wordId,
      is_read: false,
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const res = await fetch(`/api/chat/${wordId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 处理订阅限制错误
        if (res.status === 403 && data.limitReached) {
          // 移除临时消息
          setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
          // 显示升级提示
          setLimitPrompt({
            show: true,
            type: "chat",
            message: data.error || "已达到每日对话限制",
          });
          setSending(false);
          setInputValue(message); // 恢复输入内容
          return;
        }
        throw new Error(data.error || "Failed to send message");
      }

      // 移除临时消息，添加真实消息
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        data.userMessage,
        data.aiMessage,
      ]);
    } catch (error) {
      console.error("Failed to send message:", error);
      // 移除临时消息
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      // 添加错误消息
      const errorMsg: ExtendedChatMessage = {
        id: `error-${Date.now()}`,
        sender: "ai",
        content: "抱歉，我暂时无法回复。请稍后再试。",
        created_at: new Date().toISOString(),
        word_id: wordId,
        is_read: false,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  // 处理快捷操作
  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
    setShowQuickActions(false);
  };

  // 加入/移出白名单
  const toggleWhitelist = async () => {
    if (!word) return;

    try {
      if (word.is_in_whitelist) {
        await fetch(`/api/whitelist?wordId=${wordId}`, { method: "DELETE" });
      } else {
        const res = await fetch("/api/whitelist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wordId }),
        });
        const data = await res.json();
        if (data.alreadyInWhitelist) {
          // 单词已在白名单中，正常刷新即可
        }
      }
      // 更新单词信息
      await fetchChatData();
    } catch (error) {
      console.error("Failed to toggle whitelist:", error);
    }
    setShowMenu(false);
  };

  const masteryPercent = ((word?.mastery_level || 0) / 5) * 100;

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8" />
            <div className="flex-1">
              <div className="h-5 bg-muted rounded w-20 animate-pulse" />
              <div className="h-3 bg-muted rounded w-16 mt-1 animate-pulse" />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/app")}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold truncate">{word?.ai_name || word?.word}</h1>
              {masteryPercent > 0 && (
                <span className="text-xs text-foreground/60">({masteryPercent}%)</span>
              )}
            </div>
            <p className="text-xs text-foreground/60 truncate">{word?.word}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[150px] z-50">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    router.push(`/app/verify/${wordId}`);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
                >
                  🎤 声纹验证
                </button>
                <button
                  onClick={toggleWhitelist}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  {word?.is_in_whitelist ? "移出白名单" : "加入白名单"}
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    router.push(`/app/word-detail/${wordId}`);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  查看详情
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-auto p-4">
        {(isGeneratingIntro || messages.length === 0) && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {isGeneratingIntro ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <h2 className="font-semibold mb-1">正在生成自我介绍...</h2>
                <p className="text-sm text-foreground/60">
                  {word?.ai_name || word?.word} 正在准备详细的学习档案
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">{(word?.word || "W").charAt(0).toUpperCase()}</span>
                </div>
                <h2 className="font-semibold mb-1">{word?.ai_name || word?.word}</h2>
                <p className="text-sm text-foreground/60 mb-4">
                  开始与你的 AI 单词好友聊天吧！
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickActions.slice(0, 2).map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action)}
                      className="px-3 py-1.5 bg-muted hover:bg-muted/70 rounded-full text-sm transition-colors"
                    >
                      {action.icon} {action.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                word={word?.word}
                aiName={word?.ai_name}
              />
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {(word?.ai_name || word?.word || "AI").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-foreground/60" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-background">
        {/* 快捷操作面板 */}
        {showQuickActions && (
          <div className="mb-3 p-3 bg-muted rounded-xl">
            <p className="text-xs text-foreground/60 mb-2">快捷操作</p>
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action)}
                  className="flex flex-col items-center gap-1 p-2 bg-background rounded-lg hover:bg-background/80 transition-colors"
                >
                  <span className="text-lg">{action.icon}</span>
                  <span className="text-xs">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAIExpansion(true)}
            className="p-2 text-foreground/60 hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(inputValue);
              }
            }}
            placeholder="发消息..."
            className="flex-1 px-4 py-2 bg-muted rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={sending}
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || sending}
            className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* AI Expansion Panel */}
      <AIExpansionPanel
        word={word?.word || ""}
        wordId={wordId}
        isOpen={showAIExpansion}
        onClose={() => setShowAIExpansion(false)}
        onAction={(action, params) => {
          let prompt = "";
          switch (action) {
            case "memory-tips":
              prompt = AI_PROMPTS.memoryTips(word?.word || "");
              break;
            case "sentence":
              prompt = AI_PROMPTS.sentence(word?.word || "", params?.topic);
              break;
            case "compare":
              prompt = AI_PROMPTS.compare(word?.word || "", params?.compareWord);
              break;
            case "handwriting":
              router.push(`/app/handwriting/${wordId}`);
              return;
          }
          if (prompt) {
            sendMessage(prompt);
          }
        }}
      />

      {/* 订阅限制提示 */}
      {limitPrompt.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="w-full max-w-sm bg-background rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                升级订阅
              </h3>
              <button
                onClick={() => setLimitPrompt({ show: false, type: "chat", message: "" })}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-foreground/70 mb-4">{limitPrompt.message}</p>
            <div className="space-y-2">
              <button
                onClick={() => router.push("/app/subscription")}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                查看订阅套餐
              </button>
              <button
                onClick={() => setLimitPrompt({ show: false, type: "chat", message: "" })}
                className="w-full px-4 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
