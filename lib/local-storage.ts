import fs from 'fs';
import path from 'path';

// 数据存储路径
const DATA_DIR = path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const CODES_FILE = path.join(DATA_DIR, 'codes.json');

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 读取订单
export function getOrders() {
  ensureDataDir();
  if (!fs.existsSync(ORDERS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 保存订单
export function saveOrders(orders: any[]) {
  ensureDataDir();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// 创建订单
export function createOrder(order: any) {
  const orders = getOrders();
  const newOrder = {
    ...order,
    id: order.id || crypto.randomUUID(),
    created_at: new Date().toISOString(),
    status: 'pending',
  };
  orders.push(newOrder);
  saveOrders(orders);
  return newOrder;
}

// 更新订单
export function updateOrder(orderId: string, updates: any) {
  const orders = getOrders();
  const index = orders.findIndex((o: any) => o.id === orderId);
  if (index === -1) return null;
  orders[index] = { ...orders[index], ...updates };
  saveOrders(orders);
  return orders[index];
}

// 通过兑换码获取订单
export function getOrderByCode(code: string) {
  const codes = getCodes();
  const codeData = codes.find((c: any) => c.code === code);
  if (!codeData) return null;
  return getOrder(codeData.orderId);
}

// 获取单个订单
export function getOrder(orderId: string) {
  const orders = getOrders();
  return orders.find((o: any) => o.id === orderId) || null;
}

// 读取兑换码
export function getCodes() {
  ensureDataDir();
  if (!fs.existsSync(CODES_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(CODES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 保存兑换码
export function saveCodes(codes: any[]) {
  ensureDataDir();
  fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
}

// 创建兑换码
export function createCode(code: any) {
  const codes = getCodes();
  codes.push(code);
  saveCodes(codes);
  return code;
}

// 查找兑换码
export function findCode(codeStr: string) {
  const codes = getCodes();
  return codes.find((c: any) => c.code === codeStr) || null;
}

// 更新兑换码状态
export function updateCode(codeStr: string, updates: any) {
  const codes = getCodes();
  const index = codes.findIndex((c: any) => c.code === codeStr);
  if (index === -1) return null;
  codes[index] = { ...codes[index], ...updates };
  saveCodes(codes);
  return codes[index];
}
