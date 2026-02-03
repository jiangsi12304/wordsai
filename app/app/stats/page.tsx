"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Share2, Calendar, TrendingUp, Target, Award, X, Info, Flame, BookOpen, Brain, Clock, Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

type TimeRange = "week" | "month" | "all";

interface StatsData {
  totalWords: number;
  masteredWords: number;
  reviewsCompleted: number;
  accuracy: number;
  streakDays: number;
  dailyStats: {
    date: string;
    newWords: number;
    reviews: number;
    accuracy: number;
  }[];
  masteryDistribution: {
    level: number;
    count: number;
  }[];
  weeklyHeatmap: {
    day: string;
    hours: number[];
  }[];
}

// 掌握度级别配置
const masteryLevelConfig = [
  { level: 0, name: "新学", color: "#64748b", bgColor: "bg-slate-500", textColor: "text-slate-500" },
  { level: 1, name: "初识", color: "#ef4444", bgColor: "bg-red-500", textColor: "text-red-500" },
  { level: 2, name: "熟悉", color: "#f97316", bgColor: "bg-orange-500", textColor: "text-orange-500" },
  { level: 3, name: "掌握", color: "#eab308", bgColor: "bg-yellow-500", textColor: "text-yellow-500" },
  { level: 4, name: "熟练", color: "#84cc16", bgColor: "bg-lime-500", textColor: "text-lime-500" },
  { level: 5, name: "精通", color: "#22c55e", bgColor: "bg-green-500", textColor: "text-green-500" },
];

// 统计指标说明
const statExplanations = {
  totalWords: {
    title: "总单词数",
    icon: Target,
    color: "from-blue-500 to-blue-600",
    description: "你添加到词库中的所有单词总数",
    detail: "包括你手动添加的单词和系统推荐的单词。每个单词都会经过艾宾浩斯遗忘曲线的复习计划管理。",
    tips: "建议每天学习5-10个新单词，保持稳定的输入节奏，避免一次性记忆过多导致负担过重。",
  },
  masteredWords: {
    title: "已掌握",
    icon: Award,
    color: "from-green-500 to-green-600",
    description: "掌握度达到4级及以上的单词数量",
    detail: "掌握度基于复习表现计算：\n• 0-1级：初次学习\n• 2级：模糊记忆\n• 3级：基本掌握\n• 4-5级：完全掌握",
    tips: "已掌握的单词会以更长的间隔进行复习，帮助你巩固长期记忆。",
  },
  accuracy: {
    title: "正确率",
    icon: TrendingUp,
    color: "from-purple-500 to-purple-600",
    description: "所有复习测试中答对的百分比",
    detail: "计算公式：答对次数 ÷ 总复习次数 × 100%\n\n答对包括：选择\"记得\"或\"简单\"的复习结果",
    tips: "保持80%以上的正确率是理想的。如果正确率过低，建议放慢新词学习速度，多花时间复习旧词。",
  },
  streakDays: {
    title: "连续天数",
    icon: Calendar,
    color: "from-orange-500 to-orange-600",
    description: "连续进行学习的天数",
    detail: "每天添加新单词或完成复习都会计入连续天数。\n中断一天后，连续天数会重新开始计算。",
    tips: "保持连续学习可以帮助建立学习习惯，形成稳定的记忆巩固节奏。",
  },
  memoryCurve: {
    title: "记忆曲线",
    icon: TrendingUp,
    color: "from-green-500 to-green-600",
    description: "基于艾宾浩斯遗忘曲线，展示你每天复习正确率的变化趋势",
    detail: `【艾宾浩斯遗忘曲线理论】
德国心理学家艾宾浩斯发现：遗忘在学习后最初阶段最快，之后逐渐减慢。

遗忘规律：
• 20分钟后：遗忘约42%
• 1小时后：遗忘约56%
• 1天后：遗忘约74%
• 6天后：遗忘约75%

因此，及时复习是巩固记忆的关键！

【最佳复习时间点】
第1次：学习后立即复习
第2次：12小时后
第3次：1天后
第4次：2天后
第5次：4天后
第6次：7天后
第7次：15天后
第8次：30天后

本系统的复习计划就是基于这个理论设计的。`,
    tips: `【如何解读趋势图】

✅ 上升趋势：正确率越来越高，说明复习效果在提升

📊 波动较大：可能原因：
• 复习间隔太长，导致遗忘
• 单词难度不均匀，简单词和难词混在一起
• 复习时注意力不集中

💡 建议改进：
1. 保持每天固定时间复习
2. 正确率低的词可以缩短复习间隔
3. 复习时专注思考，不要凭感觉选择`,
  },
  masteryDistribution: {
    title: "掌握度分布",
    icon: Award,
    color: "from-green-500 to-green-600",
    description: "各个掌握级别的单词数量分布",
    detail: "• 0级：新添加，未复习\n• 1级：第一次复习后\n• 2级：几次复习后仍需巩固\n• 3级：基本掌握\n• 4-5级：完全掌握，长期记忆",
    tips: "理想情况下，大部分单词应该集中在2-3级，说明你在持续学习和巩固。",
  },
  heatmap: {
    title: "学习热力图",
    icon: Calendar,
    color: "from-green-500 to-green-600",
    description: "展示本周每天不同时段的学习活动",
    detail: "颜色越绿表示该时段学习活动越多。\n可以帮助你找到最适合学习的时间段。",
    tips: "找到你的高效学习时段，固定在这个时间学习可以提升效率。",
  },
  learningActivity: {
    title: "学习活动分析",
    icon: Activity,
    color: "from-indigo-500 to-indigo-600",
    description: "综合分析你的学习活动情况",
    detail: "包括新增单词、复习完成情况和学习时长等多维度分析",
    tips: "保持新增单词和复习的平衡，既要有输入也要有巩固。",
  },
};

// 动画数字组件
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCurrent(Math.floor(progress * value));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{current}</>;
}

// 进度环形图组件
function CircularProgress({
  value,
  maxValue,
  size = 80,
  strokeWidth = 8,
  children,
  color = "#22c55e"
}: {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  children: React.ReactNode;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / maxValue, 1);
  const offset = circumference - progress * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [selectedStat, setSelectedStat] = useState<keyof typeof statExplanations | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  useEffect(() => {
    if (stats) {
      setAnimate(true);
    }
  }, [stats]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/stats?range=${timeRange}`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    alert("分享功能开发中");
  };

  const openExplanation = (statKey: keyof typeof statExplanations) => {
    setSelectedStat(statKey);
  };

  const closeExplanation = () => {
    setSelectedStat(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // 记忆曲线数据
  const memoryCurveData = stats?.dailyStats.map((d) => ({
    date: new Date(d.date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
    accuracy: Math.round(d.accuracy * 100),
    newWords: d.newWords,
    reviews: d.reviews,
  })) || [];

  // 雷达图数据
  const radarData = [
    { subject: "新词学习", value: Math.min((stats?.totalWords || 0) / 10, 100), fullMark: 100 },
    { subject: "复习完成", value: Math.min((stats?.reviewsCompleted || 0) * 5, 100), fullMark: 100 },
    { subject: "正确率", value: stats?.accuracy || 0, fullMark: 100 },
    { subject: "掌握程度", value: Math.min(((stats?.masteredWords || 0) / Math.max((stats?.totalWords || 1), 1)) * 100, 100), fullMark: 100 },
    { subject: "学习连续", value: Math.min((stats?.streakDays || 0) * 10, 100), fullMark: 100 },
  ];

  // 掌握度分布数据（只显示有数据的）
  const filteredMasteryDist = stats?.masteryDistribution.filter(d => d.count > 0) || [];

  // 学习热力图数据
  const heatmapData = stats?.weeklyHeatmap || [];
  const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const hours = Array.from({ length: 12 }, (_, i) => `${i * 2 + 6}:00`);

  // 计算本周学习总时长
  const totalStudyMinutes = heatmapData.reduce((sum, day) =>
    sum + day.hours.reduce((s, h) => s + h, 0), 0
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/app/profile")}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">学习统计</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 核心指标卡片 - 带动画 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 总单词数 */}
          <div
            className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300"
            onClick={() => openExplanation("totalWords")}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            <Target className="w-8 h-8 mb-2 opacity-80 relative z-10" />
            <p className="text-4xl font-bold relative z-10">
              {animate ? <AnimatedNumber value={stats?.totalWords || 0} /> : 0}
            </p>
            <p className="text-sm opacity-80 relative z-10">总单词数</p>
            <div className="absolute bottom-2 right-2 w-16 h-16">
              <CircularProgress
                value={stats?.masteredWords || 0}
                maxValue={stats?.totalWords || 1}
                size={64}
                strokeWidth={4}
                color="rgba(255,255,255,0.4)"
              >
                <span className="text-xs font-medium">
                  {Math.round(((stats?.masteredWords || 0) / Math.max((stats?.totalWords || 1), 1)) * 100)}%
                </span>
              </CircularProgress>
            </div>
          </div>

          {/* 已掌握 */}
          <div
            className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300"
            onClick={() => openExplanation("masteredWords")}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            <Award className="w-8 h-8 mb-2 opacity-80 relative z-10" />
            <p className="text-4xl font-bold relative z-10">
              {animate ? <AnimatedNumber value={stats?.masteredWords || 0} /> : 0}
            </p>
            <p className="text-sm opacity-80 relative z-10">已掌握</p>
            <div className="mt-2 flex items-center gap-1 relative z-10">
              <Brain className="w-4 h-4 opacity-70" />
              <span className="text-xs opacity-70">
                {Math.round(((stats?.masteredWords || 0) / Math.max((stats?.totalWords || 1), 1)) * 100)}% 完成率
              </span>
            </div>
          </div>

          {/* 正确率 */}
          <div
            className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300"
            onClick={() => openExplanation("accuracy")}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            <TrendingUp className="w-8 h-8 mb-2 opacity-80 relative z-10" />
            <div className="flex items-baseline gap-1 relative z-10">
              <p className="text-4xl font-bold">
                {animate ? <AnimatedNumber value={stats?.accuracy || 0} /> : 0}
              </p>
              <span className="text-2xl">%</span>
            </div>
            <p className="text-sm opacity-80 relative z-10">正确率</p>
            {/* 正确率指示条 */}
            <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden relative z-10">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-1000"
                style={{ width: `${animate ? stats?.accuracy || 0 : 0}%` }}
              />
            </div>
          </div>

          {/* 连续天数 */}
          <div
            className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300"
            onClick={() => openExplanation("streakDays")}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            <Flame className="w-8 h-8 mb-2 opacity-80 relative z-10" />
            <div className="flex items-baseline gap-1 relative z-10">
              <p className="text-4xl font-bold">
                {animate ? <AnimatedNumber value={stats?.streakDays || 0} /> : 0}
              </p>
              <span className="text-lg">天</span>
            </div>
            <p className="text-sm opacity-80 relative z-10">连续学习</p>
            <div className="mt-1 flex items-center gap-1 relative z-10">
              {Array.from({ length: Math.min((stats?.streakDays || 0), 7) }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-white/60" />
              ))}
            </div>
          </div>
        </div>

        {/* 时间范围切换 */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <TabsList className="grid w-full max-w-xs grid-cols-3">
            <TabsTrigger value="week">本周</TabsTrigger>
            <TabsTrigger value="month">本月</TabsTrigger>
            <TabsTrigger value="all">全部</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 综合学习雷达图 */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">学习能力雷达</h3>
              <p className="text-xs text-foreground/50 mt-1">综合评估你的学习状况</p>
            </div>
            <Info
              className="w-4 h-4 text-foreground/40 cursor-pointer"
              onClick={() => openExplanation("learningActivity")}
            />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" strokeWidth={1} />
              <PolarAngleAxis
                dataKey="subject"
                className="text-xs text-foreground/60"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "#9ca3af", fontSize: 9 }}
              />
              <Radar
                name="能力值"
                dataKey="value"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 学习活动组合图表 */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">学习活动趋势</h3>
              <p className="text-xs text-foreground/50 mt-1">新增单词 & 复习完成</p>
            </div>
            <Info
              className="w-4 h-4 text-foreground/40 cursor-pointer"
              onClick={() => openExplanation("memoryCurve")}
            />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={memoryCurveData}>
              <defs>
                <linearGradient id="colorNewWords" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={11}
                tick={{ fill: "#9ca3af" }}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={11}
                tick={{ fill: "#9ca3af" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "#374151",
                  borderRadius: "12px",
                }}
                labelStyle={{ color: "#f3f4f6" }}
              />
              <Area
                type="monotone"
                dataKey="newWords"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorNewWords)"
                animationDuration={1000}
              />
              <Area
                type="monotone"
                dataKey="reviews"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#colorReviews)"
                animationDuration={1000}
              />
              <Legend
                wrapperStyle={{ paddingTop: 10 }}
                iconType="circle"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 正确率曲线图 */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">记忆曲线</h3>
              <p className="text-xs text-foreground/50 mt-1">正确率变化趋势</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={memoryCurveData}>
              <defs>
                <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.5} />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={11}
                tick={{ fill: "#9ca3af" }}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={11}
                tick={{ fill: "#9ca3af" }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "#374151",
                  borderRadius: "12px",
                }}
                labelStyle={{ color: "#f3f4f6" }}
                formatter={(value) => [`${value}%`, "正确率"]}
              />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke="#22c55e"
                strokeWidth={3}
                fill="url(#colorAccuracy)"
                animationDuration={1500}
                dot={{ fill: "#22c55e", r: 4, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 掌握度分布 - 横向条形图 */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">掌握度分布</h3>
              <p className="text-xs text-foreground/50 mt-1">各等级单词数量</p>
            </div>
            <Info
              className="w-4 h-4 text-foreground/40 cursor-pointer"
              onClick={() => openExplanation("masteryDistribution")}
            />
          </div>
          <div className="space-y-3">
            {masteryLevelConfig.map((config) => {
              const count = stats?.masteryDistribution.find(d => d.level === config.level)?.count || 0;
              const maxCount = Math.max(...(stats?.masteryDistribution.map(d => d.count) || [1]));
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const isAnimated = animate;

              return (
                <div key={config.level} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center text-white font-bold text-sm`}>
                    {config.level}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{config.name}</span>
                      <span className="text-sm text-foreground/60">{count} 个</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${config.bgColor} transition-all duration-1000 ease-out`}
                        style={{ width: isAnimated ? `${percentage}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 掌握度环形图 */}
        {filteredMasteryDist.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-semibold mb-4">掌握度占比</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={filteredMasteryDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                  animationBegin={200}
                  animationDuration={800}
                >
                  {filteredMasteryDist.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={masteryLevelConfig[entry.level].color}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "#374151",
                    borderRadius: "12px",
                  }}
                  labelStyle={{ color: "#f3f4f6" }}
                  formatter={(value: unknown, name: unknown) => {
                    const numValue = typeof value === "number" ? value : 0;
                    const level = typeof name === "number" ? name : 0;
                    const total = filteredMasteryDist.reduce((sum, d) => sum + d.count, 0);
                    const percentage = total > 0 ? Math.round((numValue / total) * 100) : 0;
                    return `${masteryLevelConfig[level]?.name || level}级: ${numValue}个 (${percentage}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* 图例 */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {filteredMasteryDist.map((entry) => {
                const config = masteryLevelConfig[entry.level];
                return (
                  <div key={entry.level} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${config.bgColor}`} />
                    <span className="text-xs text-foreground/60">{config.name} {entry.level}级</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 学习热力图 */}
        <div
          className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => openExplanation("heatmap")}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">学习热力图</h3>
              <p className="text-xs text-foreground/50 mt-1">本周学习时段分布 · 总计 {Math.round(totalStudyMinutes / 10) / 10}小时</p>
            </div>
            <Clock className="w-4 h-4 text-foreground/40" />
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* 头部时间 */}
              <div className="flex">
                <div className="w-12 text-xs text-foreground/40" />
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="w-10 text-xs text-foreground/40 text-center"
                  >
                    {hour}
                  </div>
                ))}
              </div>
              {/* 星期和热力图 */}
              {heatmapData.map((dayData, dayIndex) => (
                <div key={dayData.day} className="flex">
                  <div className="w-12 text-xs text-foreground/60 flex items-center">
                    {weekdays[dayIndex]}
                  </div>
                  {dayData.hours.map((hourCount, hourIndex) => {
                    const intensity = Math.min(hourCount / 10, 1);
                    const bgColors = [
                      "bg-muted/20",
                      "bg-green-500/20",
                      "bg-green-500/40",
                      "bg-green-500/60",
                      "bg-green-500/80",
                      "bg-green-500",
                    ];
                    const colorIndex = hourCount === 0 ? 0 : Math.min(Math.ceil(hourCount / 2), 5);

                    return (
                      <div
                        key={hourIndex}
                        className={`w-10 h-10 m-px rounded ${bgColors[colorIndex]} transition-all hover:scale-110`}
                        title={`${weekdays[dayIndex]} ${hours[hourIndex]}: ${hourCount} 分钟`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* 图例 */}
          <div className="flex items-center justify-center gap-6 mt-4">
            {[
              { label: "无记录", bg: "bg-muted/20" },
              { label: "1-2分钟", bg: "bg-green-500/20" },
              { label: "3-5分钟", bg: "bg-green-500/40" },
              { label: "6-10分钟", bg: "bg-green-500/60" },
              { label: "10+分钟", bg: "bg-green-500" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${item.bg}`} />
                <span className="text-xs text-foreground/50">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 学习成就卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
            <BookOpen className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{stats?.reviewsCompleted || 0}</p>
            <p className="text-xs opacity-80">总复习次数</p>
          </div>
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-4 text-white">
            <Target className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-2xl font-bold">
              {Math.round(((stats?.masteredWords || 0) / Math.max((stats?.totalWords || 1), 1)) * 100)}%
            </p>
            <p className="text-xs opacity-80">掌握率</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-4 text-white">
            <Clock className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{Math.round(totalStudyMinutes / 60)}h</p>
            <p className="text-xs opacity-80">本周学习</p>
          </div>
        </div>
      </div>

      {/* Explanation Modal */}
      {selectedStat && (
        <ExplanationModal
          stat={statExplanations[selectedStat]}
          onClose={closeExplanation}
        />
      )}
    </div>
  );
}

// 说明弹窗组件
function ExplanationModal({
  stat,
  onClose,
}: {
  stat: {
    title: string;
    icon: any;
    color: string;
    description: string;
    detail: string;
    tips: string;
  };
  onClose: () => void;
}) {
  const Icon = stat.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-auto animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold">{stat.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-foreground/70 mb-4">{stat.description}</p>

        {/* Detail */}
        <div className="bg-muted/30 rounded-xl p-4 mb-4">
          <h3 className="font-medium text-sm mb-2 text-foreground/80">📖 详细说明</h3>
          <p className="text-sm text-foreground/70 whitespace-pre-line">{stat.detail}</p>
        </div>

        {/* Tips */}
        <div className="bg-primary/10 rounded-xl p-4">
          <h3 className="font-medium text-sm mb-2 text-primary">💡 小贴士</h3>
          <p className="text-sm text-primary/80 whitespace-pre-line">{stat.tips}</p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
