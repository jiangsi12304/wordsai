/**
 * 艾宾浩斯遗忘曲线复习算法
 *
 * 基于艾宾浩斯遗忘曲线理论，计算最佳复习时间间隔
 *
 * 艾宾浩斯间隔：20分钟 -> 1小时 -> 8小时 -> 1天 -> 2天 -> 6天 -> 15天 -> 1个月
 */

export type ReviewResult = "forgot" | "hard" | "good" | "easy";

export interface ReviewSchedule {
  stage: number;
  intervalDays: number;
  intervalHours: number;
  nextReviewAt: Date;
  easeFactor: number;
  memoryStrength: number;
}

export interface WordReviewState {
  wordId: string;
  currentStage: number;
  intervalDays: number;
  easeFactor: number;
  memoryStrength: number;
  reviewCount: number;
  correctCount: number;
  errorCount: number;
  lastReviewAt?: Date;
}

// 艾宾浩斯间隔序列（天数）
const EBBINGHAUS_INTERVALS_DAYS = [0, 0.014, 0.04, 0.33, 1, 2, 6, 15, 30];

// SM-2 算法默认参数
const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

/**
 * 计算下次复习时间（基于艾宾浩斯曲线）
 */
export function calculateNextReview(
  currentState: WordReviewState,
  result: ReviewResult
): ReviewSchedule {
  let newStage = currentState.currentStage;
  let newEaseFactor = currentState.easeFactor;
  let newMemoryStrength = currentState.memoryStrength;

  // 根据复习结果调整参数
  switch (result) {
    case "forgot":
      // 完全忘记，重置到第一阶段
      newStage = 1;
      newEaseFactor = Math.max(MIN_EASE_FACTOR, currentState.easeFactor - 0.2);
      newMemoryStrength = Math.max(0, currentState.memoryStrength - 0.3);
      break;

    case "hard":
      // 困难，保持当前阶段或降一级
      newStage = Math.max(1, currentState.currentStage);
      newEaseFactor = Math.max(MIN_EASE_FACTOR, currentState.easeFactor - 0.1);
      newMemoryStrength = Math.max(0, currentState.memoryStrength - 0.05);
      break;

    case "good":
      // 良好，进入下一阶段
      newStage = Math.min(
        EBBINGHAUS_INTERVALS_DAYS.length - 1,
        currentState.currentStage + 1
      );
      newEaseFactor = currentState.easeFactor;
      newMemoryStrength = Math.min(1, currentState.memoryStrength + 0.1);
      break;

    case "easy":
      // 容易，跳过一级
      newStage = Math.min(
        EBBINGHAUS_INTERVALS_DAYS.length - 1,
        currentState.currentStage + 2
      );
      newEaseFactor = Math.min(3.0, currentState.easeFactor + 0.1);
      newMemoryStrength = Math.min(1, currentState.memoryStrength + 0.15);
      break;
  }

  const intervalDays = EBBINGHAUS_INTERVALS_DAYS[newStage] || 1;
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  return {
    stage: newStage,
    intervalDays,
    intervalHours: intervalDays * 24,
    nextReviewAt,
    easeFactor: newEaseFactor,
    memoryStrength: newMemoryStrength,
  };
}

/**
 * 使用 SM-2 算法计算下次复习时间（SuperMemo 2）
 *
 * SM-2 是一种更精确的间隔重复算法，使用 ease factor 来动态调整间隔
 */
export function calculateSM2(
  currentState: WordReviewState,
  quality: number // 0-5: 0=完全忘记, 5=完美记忆
): ReviewSchedule {
  // 转换质量到我们的结果类型
  const result = qualityToResult(quality);
  return calculateNextReview(currentState, result);
}

/**
 * 质量评分转换为结果类型
 */
function qualityToResult(quality: number): ReviewResult {
  if (quality <= 1) return "forgot";
  if (quality === 2) return "hard";
  if (quality === 3) return "good";
  return "easy";
}

/**
 * 结果类型转换为质量评分
 */
export function resultToQuality(result: ReviewResult): number {
  switch (result) {
    case "forgot": return 0;
    case "hard": return 2;
    case "good": return 3;
    case "easy": return 5;
  }
}

/**
 * 计算掌握度 (0-5)
 */
export function calculateMasteryLevel(
  memoryStrength: number,
  reviewCount: number,
  correctCount: number,
  errorCount: number
): number {
  // 基础掌握度基于记忆强度
  let mastery = Math.floor(memoryStrength * 5);

  // 根据复习次数调整
  if (reviewCount > 0) {
    const correctRate = correctCount / reviewCount;
    const rateBonus = Math.floor((correctRate - 0.5) * 2);
    mastery = Math.max(0, Math.min(5, mastery + rateBonus));
  }

  // 至少需要复习 3 次才能达到 3 级以上
  if (mastery >= 3 && reviewCount < 3) {
    mastery = Math.max(2, reviewCount);
  }

  return mastery;
}

/**
 * 判断单词是否需要复习
 */
export function needsReview(nextReviewAt: Date | string): boolean {
  const reviewTime = typeof nextReviewAt === "string"
    ? new Date(nextReviewAt)
    : nextReviewAt;
  return reviewTime <= new Date();
}

/**
 * 获取今日需要复习的单词数量预估
 */
export function estimateTodayReviews(
  words: Array<{ next_review_at: string | Date }>
): number {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return words.filter(word => {
    const reviewTime = typeof word.next_review_at === "string"
      ? new Date(word.next_review_at)
      : word.next_review_at;
    return reviewTime <= today;
  }).length;
}

/**
 * 生成复习提醒消息
 */
export function generateReviewReminder(
  word: string,
  daysSinceLastReview: number,
  masteryLevel: number
): string {
  const reminders = [
    `嗨！我是 ${word}，好久不见啦～`,
    `${daysSinceLastReview} 天没见啦，还记得我是什么意思吗？`,
    `该复习我啦，${word} 想你啦～`,
    `来复习一下 ${word} 吧，别把我忘掉了！`,
    `嘿！${word} 在这里等你来复习哦～`,
  ];

  if (masteryLevel <= 2) {
    reminders.push(`我是 ${word}，还记得我们怎么认识的吗？`);
    reminders.push(`${word} 觉得你好像有点生疏了...`);
  }

  return reminders[Math.floor(Math.random() * reminders.length)];
}

/**
 * 计算今日学习进度
 */
export interface DailyProgress {
  totalWords: number;
  reviewedWords: number;
  newWords: number;
  correctRate: number;
  streakDays: number;
}

export function calculateDailyProgress(
  stats: {
    total_words?: number;
    reviews_completed?: number;
    new_words_learned?: number;
    reviews_correct?: number;
    streak_days?: number;
  }
): DailyProgress {
  const reviewsCompleted = stats.reviews_completed || 0;

  return {
    totalWords: stats.total_words || 0,
    reviewedWords: reviewsCompleted,
    newWords: stats.new_words_learned || 0,
    correctRate: reviewsCompleted > 0
      ? (stats.reviews_correct || 0) / reviewsCompleted
      : 0,
    streakDays: stats.streak_days || 0,
  };
}

/**
 * 复习队列优先级排序
 */
export function sortReviewQueue<T extends {
  next_review_at: string | Date;
  mastery_level?: number;
  error_count?: number;
  review_count?: number;
}>(
  words: T[]
): T[] {
  return [...words].sort((a, b) => {
    // 优先级：错过复习时间的 > 错误多的 > 复习次数少的 > 掌握度低的
    const aOverdue = needsReview(a.next_review_at);
    const bOverdue = needsReview(b.next_review_at);

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    const aErrors = a.error_count || 0;
    const bErrors = b.error_count || 0;
    if (aErrors !== bErrors) return bErrors - aErrors;

    const aReviews = a.review_count || 0;
    const bReviews = b.review_count || 0;
    if (aReviews !== bReviews) return aReviews - bReviews;

    const aMastery = a.mastery_level || 0;
    const bMastery = b.mastery_level || 0;
    return aMastery - bMastery;
  });
}

/**
 * 导出复习数据到 CSV
 */
export function exportReviewData(words: Array<{
  word: string;
  review_count: number;
  correct_count: number;
  error_count: number;
  mastery_level: number;
  next_review_at: string;
}>): string {
  const headers = ["单词", "复习次数", "正确次数", "错误次数", "掌握度", "下次复习"];
  const rows = words.map(w => [
    w.word,
    w.review_count.toString(),
    w.correct_count.toString(),
    w.error_count.toString(),
    `${w.mastery_level}/5`,
    new Date(w.next_review_at).toLocaleDateString("zh-CN"),
  ]);

  return [headers, ...rows].map(row => row.join(",")).join("\n");
}
