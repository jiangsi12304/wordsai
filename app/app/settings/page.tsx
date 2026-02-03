"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Bell,
  Volume2,
  MessageSquare,
  Database,
  Lock,
  Info,
  LogOut,
  Loader2,
  Trash2,
  Moon,
  Sun,
  Check,
  Download,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";

type AccentPreference = "uk" | "us";
type ConversationStyle = "friendly" | "formal" | "humorous" | "strict";

interface Settings {
  notifications: {
    reviewReminder: boolean;
    dailyGoal: boolean;
    newFeatures: boolean;
  };
  pronunciation: AccentPreference;
  aiPreference: {
    conversationStyle: ConversationStyle;
    responseLength: "short" | "medium" | "long";
  };
  theme: "light" | "dark" | "auto";
}

const ACCENT_OPTIONS = [
  { value: "us" as const, label: "美式发音", description: "美式英语发音" },
  { value: "uk" as const, label: "英式发音", description: "英式英语发音" },
];

const STYLE_OPTIONS = [
  { value: "friendly" as const, label: "友好型", description: "像朋友一样轻松聊天" },
  { value: "formal" as const, label: "正式型", description: "更正式的教学风格" },
  { value: "humorous" as const, label: "幽默型", description: "有趣幽默的对话方式" },
  { value: "strict" as const, label: "严格型", description: "严格认真的学习督导" },
];

const LENGTH_OPTIONS = [
  { value: "short" as const, label: "简洁", description: "快速回复，重点突出" },
  { value: "medium" as const, label: "适中", description: "平衡的回复长度" },
  { value: "long" as const, label: "详细", description: "详细解释，举一反三" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  const [settings, setSettings] = useState<Settings>({
    notifications: {
      reviewReminder: true,
      dailyGoal: true,
      newFeatures: false,
    },
    pronunciation: "us",
    aiPreference: {
      conversationStyle: "friendly",
      responseLength: "medium",
    },
    theme: "auto",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showingSection, setShowingSection] = useState<string | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setSettings({
          notifications: data.notifications || settings.notifications,
          pronunciation: data.pronunciation || "us",
          aiPreference: data.ai_preference || settings.aiPreference,
          theme: data.theme || "auto",
        });

        if (data.theme) {
          setTheme(data.theme);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          notifications: settings.notifications,
          pronunciation: settings.pronunciation,
          ai_preference: settings.aiPreference,
          theme: settings.theme,
        });

      if (settings.theme !== "auto") {
        setTheme(settings.theme);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("确定要退出登录吗？")) return;

    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const handleClearCache = async () => {
    if (!confirm("确定要清理缓存吗？这将清除本地存储的数据。")) return;

    setClearingCache(true);
    try {
      localStorage.clear();
      sessionStorage.clear();
      alert("缓存已清理");
    } catch (error) {
      console.error("Failed to clear cache:", error);
    } finally {
      setClearingCache(false);
    }
  };

  const handleChangePassword = () => {
    router.push("/auth/forgot-password");
  };

  const handleExport = async (format: "csv" | "json") => {
    setExporting(true);
    setExportError(null);

    try {
      const res = await fetch(`/api/export?format=${format}`);

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403) {
          // 需要升级
          if (confirm(data.error || "数据导出需要高级版或更高订阅，是否前往查看订阅套餐？")) {
            router.push("/app/subscription");
          }
          return;
        }
        throw new Error(data.error || "导出失败");
      }

      // 下载文件
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `word-learning-data.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error("Export error:", error);
      setExportError(error.message || "导出失败");
    } finally {
      setExporting(false);
    }
  };

  const toggleSection = (section: string) => {
    setShowingSection(showingSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/app/profile")}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">设置</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Notifications Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection("notifications")}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition-colors"
          >
            <Bell className="w-5 h-5 text-foreground/60" />
            <span className="flex-1 text-left font-medium">通知管理</span>
            <span className="text-foreground/40">{showingSection === "notifications" ? "▼" : ">"}</span>
          </button>

          {showingSection === "notifications" && (
            <div className="px-4 pb-4 space-y-3">
              <ToggleItem
                label="复习提醒"
                description="定时提醒复习单词"
                checked={settings.notifications.reviewReminder}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, reviewReminder: checked },
                  })
                }
              />
              <ToggleItem
                label="每日目标"
                description="每日学习目标达成通知"
                checked={settings.notifications.dailyGoal}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, dailyGoal: checked },
                  })
                }
              />
              <ToggleItem
                label="新功能通知"
                description="应用更新和功能通知"
                checked={settings.notifications.newFeatures}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, newFeatures: checked },
                  })
                }
              />
            </div>
          )}
        </div>

        {/* Pronunciation Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection("pronunciation")}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition-colors"
          >
            <Volume2 className="w-5 h-5 text-foreground/60" />
            <span className="flex-1 text-left font-medium">发音设置</span>
            <span className="text-sm text-foreground/60">
              {settings.pronunciation === "us" ? "美式" : "英式"}
            </span>
            <span className="text-foreground/40">{showingSection === "pronunciation" ? "▼" : ">"}</span>
          </button>

          {showingSection === "pronunciation" && (
            <div className="px-4 pb-4 space-y-2">
              {ACCENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSettings({ ...settings, pronunciation: option.value })}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                    settings.pronunciation === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="text-left">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-xs text-foreground/60">{option.description}</p>
                  </div>
                  {settings.pronunciation === option.value && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Preference Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection("ai")}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-foreground/60" />
            <span className="flex-1 text-left font-medium">AI 偏好</span>
            <span className="text-foreground/40">{showingSection === "ai" ? "▼" : ">"}</span>
          </button>

          {showingSection === "ai" && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <p className="text-sm text-foreground/60 mb-2">对话风格</p>
                <div className="space-y-2">
                  {STYLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          aiPreference: {
                            ...settings.aiPreference,
                            conversationStyle: option.value,
                          },
                        })
                      }
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                        settings.aiPreference.conversationStyle === option.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="text-left">
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-foreground/60">{option.description}</p>
                      </div>
                      {settings.aiPreference.conversationStyle === option.value && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-foreground/60 mb-2">回复长度</p>
                <div className="space-y-2">
                  {LENGTH_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          aiPreference: {
                            ...settings.aiPreference,
                            responseLength: option.value,
                          },
                        })
                      }
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                        settings.aiPreference.responseLength === option.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="text-left">
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-foreground/60">{option.description}</p>
                      </div>
                      {settings.aiPreference.responseLength === option.value && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Appearance Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection("appearance")}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition-colors"
          >
            {theme === "dark" ? (
              <Moon className="w-5 h-5 text-foreground/60" />
            ) : (
              <Sun className="w-5 h-5 text-foreground/60" />
            )}
            <span className="flex-1 text-left font-medium">外观设置</span>
            <span className="text-sm text-foreground/60">
              {settings.theme === "auto" ? "跟随系统" : settings.theme === "dark" ? "深色" : "浅色"}
            </span>
            <span className="text-foreground/40">{showingSection === "appearance" ? "▼" : ">"}</span>
          </button>

          {showingSection === "appearance" && (
            <div className="px-4 pb-4 space-y-2">
              {[
                { value: "light" as const, label: "浅色模式", icon: Sun },
                { value: "dark" as const, label: "深色模式", icon: Moon },
                { value: "auto" as const, label: "跟随系统", icon: Bell },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      const newTheme = option.value;
                      setSettings({ ...settings, theme: newTheme });
                      setTheme(newTheme);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                      settings.theme === option.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-foreground/60" />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    {settings.theme === option.value && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Data & Storage Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection("data")}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition-colors"
          >
            <Database className="w-5 h-5 text-foreground/60" />
            <span className="flex-1 text-left font-medium">数据与存储</span>
            <span className="text-foreground/40">{showingSection === "data" ? "▼" : ">"}</span>
          </button>

          {showingSection === "data" && (
            <div className="px-4 pb-4 space-y-3">
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-foreground/60 mb-1">本地缓存</p>
                <p className="text-lg font-semibold">
                  {(localStorage.length * 2 / 1024).toFixed(2)} KB
                </p>
              </div>

              {/* 导出数据 */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">导出学习数据</p>
                  <Crown className="w-3 h-3 text-yellow-500" />
                </div>
                <p className="text-xs text-foreground/60 mb-3">高级版功能，支持导出CSV和JSON格式</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleExport("csv")}
                    disabled={exporting}
                  >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "CSV"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleExport("json")}
                    disabled={exporting}
                  >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "JSON"}
                  </Button>
                </div>
                {exportError && (
                  <p className="text-xs text-red-500 mt-2">{exportError}</p>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleClearCache}
                disabled={clearingCache}
              >
                <Trash2 className="w-4 h-4" />
                {clearingCache ? "清理中..." : "清理缓存"}
              </Button>
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection("account")}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition-colors"
          >
            <Lock className="w-5 h-5 text-foreground/60" />
            <span className="flex-1 text-left font-medium">账号与安全</span>
            <span className="text-foreground/40">{showingSection === "account" ? "▼" : ">"}</span>
          </button>

          {showingSection === "account" && (
            <div className="px-4 pb-4 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleChangePassword}
              >
                修改密码
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm("确定要注销账号吗？此操作不可恢复！")) {
                    alert("请联系客服处理注销请求");
                  }
                }}
              >
                注销账号
              </Button>
            </div>
          )}
        </div>

        {/* About Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection("about")}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition-colors"
          >
            <Info className="w-5 h-5 text-foreground/60" />
            <span className="flex-1 text-left font-medium">关于我们</span>
            <span className="text-foreground/40">{showingSection === "about" ? "▼" : ">"}</span>
          </button>

          {showingSection === "about" && (
            <div className="px-4 pb-4 space-y-3">
              <div className="text-center py-4">
                <h3 className="text-xl font-bold mb-1">WordMate 词友</h3>
                <p className="text-sm text-foreground/60">版本 1.0.0</p>
                <p className="text-xs text-foreground/40 mt-1">让每个单词都成为你的朋友</p>
              </div>
              <div className="text-xs text-foreground/60 space-y-1">
                <p>© 2025 WordMate</p>
                <p>用户协议 | 隐私政策</p>
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className="p-4">
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </Button>
        </div>
      </div>

      {/* Save Button */}
      {saving || showingSection ? (
        <div className="border-t border-border bg-card p-4">
          <Button
            className="w-full"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              "保存设置"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ToggleItem({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-foreground/60">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-12 h-6 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-7" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
