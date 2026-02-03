import { customAlphabet } from 'nanoid';

// 生成安全的兑换码
export function generateRedemptionCode(): string {
  // 使用自定义字符集，去除易混淆字符 (0O, 1Il)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const nanoid = customAlphabet(chars, 12);

  // 格式化为 XXXX-XXXX-XXXX
  const code = nanoid();
  return [
    code.slice(0, 4),
    code.slice(4, 8),
    code.slice(8, 12),
  ].join('-').toUpperCase();
}

// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 格式化金额
export function formatAmount(amount: number | string): string {
  return `¥${Number(amount).toFixed(2)}`;
}

// 订单状态文本映射
export const orderStatusText: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  expired: '已过期',
  cancelled: '已取消',
};

// 兑换码状态文本映射
export const codeStatusText: Record<string, string> = {
  unused: '未使用',
  used: '已使用',
  expired: '已过期',
};
