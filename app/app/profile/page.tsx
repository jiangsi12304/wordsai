"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  BarChart3,
  BookOpen,
  CreditCard,
  Settings,
  HelpCircle,
  Flame,
  Loader2,
  TrendingUp,
  Receipt,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <h1 className="text-xl font-semibold">我的</h1>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
        </div>
      ) : (
        <>
          {/* Profile Info */}
          <div className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">学习者</h2>
              <p className="text-sm text-foreground/60">坚持学习，每天进步</p>
            </div>
          </div>

          {/* Stats */}
          <div className="px-6 pb-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">
                  {stats?.streak?.current || 0}
                </p>
                <p className="text-xs text-foreground/60 flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3" />
                  连续天数
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {stats?.overview?.totalWords || 0}
                </p>
                <p className="text-xs text-foreground/60">掌握单词</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">
                  {Math.round((stats?.overview?.correctRate || 0) * 100)}%
                </p>
                <p className="text-xs text-foreground/60 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  正确率
                </p>
              </div>
            </div>
          </div>

          {/* Today's Progress */}
          {stats?.today && (
            <div className="px-6 pb-4">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4">
                <h3 className="text-sm font-medium mb-3">今日学习</h3>
                <div className="flex justify-around">
                  <div className="text-center">
                    <p className="text-lg font-bold">{stats.today.newWords}</p>
                    <p className="text-xs text-foreground/60">新词</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{stats.today.reviews}</p>
                    <p className="text-xs text-foreground/60">复习</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">
                      {Math.round(stats.today.timeSpentMinutes)}m
                    </p>
                    <p className="text-xs text-foreground/60">时长</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mastery Distribution */}
          {stats?.masteryDistribution && (
            <div className="px-6 pb-4">
              <div className="bg-muted/30 rounded-xl p-4">
                <h3 className="text-sm font-medium mb-3">掌握度分布</h3>
                <div className="flex gap-1 h-8 items-end">
                  {[0, 1, 2, 3, 4, 5].map((level) => (
                    <div key={level} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t"
                        style={{
                          backgroundColor:
                            level === 0
                              ? "#9ca3af"
                              : level === 1
                              ? "#ef4444"
                              : level === 2
                              ? "#f97316"
                              : level === 3
                              ? "#eab308"
                              : level === 4
                              ? "#84cc16"
                              : "#22c55e",
                          height: `${Math.max(4, (stats.masteryDistribution[level] || 0) / Math.max(...stats.masteryDistribution) * 32)}px`,
                        }}
                      />
                      <span className="text-xs text-foreground/60">{level}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="flex-1 px-4 overflow-auto">
            <div className="bg-muted/30 rounded-xl overflow-hidden">
              <MenuItem
                icon={<BarChart3 className="w-5 h-5" />}
                label="学习数据"
                onClick={() => handleNavigation("/app/stats")}
              />
              <MenuItem
                icon={<BookOpen className="w-5 h-5" />}
                label="我的词库"
                onClick={() => handleNavigation("/app/library")}
              />
              <MenuItem
                icon={<Flame className="w-5 h-5" />}
                label="开始复习"
                onClick={() => handleNavigation("/app/review")}
              />
              <MenuItem
                icon={<CreditCard className="w-5 h-5" />}
                label="会员订阅"
                onClick={() => handleNavigation("/app/subscription")}
              />
              <MenuItem
                icon={<Receipt className="w-5 h-5" />}
                label="我的订单"
                onClick={() => handleNavigation("/app/orders")}
              />
              <MenuItem
                icon={<Settings className="w-5 h-5" />}
                label="设置"
                onClick={() => handleNavigation("/app/settings")}
              />
              <MenuItem
                icon={<HelpCircle className="w-5 h-5" />}
                label="帮助与反馈"
                onClick={() => alert("帮助页面开发中...")}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 text-left"
    >
      <span className="text-foreground/60">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="text-foreground/40">{">"}</span>
    </button>
  );
}
