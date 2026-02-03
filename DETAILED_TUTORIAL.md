# 扫码支付系统 - 完整教程

本教程将手把手教你如何搭建一个完整的扫码支付 + 兑换码系统。

## 目录

1. [系统概述](#1-系统概述)
2. [准备工作](#2-准备工作)
3. [Supabase 数据库配置](#3-supabase-数据库配置)
4. [环境变量配置](#4-环境变量配置)
5. [收款二维码配置](#5-收款二维码配置)
6. [邮件服务配置（可选）](#6-邮件服务配置可选)
7. [启动项目](#7-启动项目)
8. [完整使用流程](#8-完整使用流程)
9. [常见问题](#9-常见问题)

---

## 1. 系统概述

### 1.1 系统功能

```
用户端                          管理端
  │                              │
  ├── 输入邮箱                    │
  ├── 选择支付方式（微信/支付宝）   │
  ├── 扫码支付                    │
  ├── 自动检测支付状态             │
  │                              │
  │                              ├── 查看待支付订单
  │                              ├── 确认收款
  │                              ├── 生成兑换码
  │                              └── 自动发送邮件
  │                              │
  └── 收到兑换码邮件              │
  │                              │
  └── 在兑换页面使用兑换码         │
```

### 1.2 文件结构

```
with-supabase-app/
├── app/
│   ├── api/
│   │   ├── payment/
│   │   │   ├── create/route.ts      # 创建订单 API
│   │   │   ├── check/[orderId]/     # 检查支付状态 API
│   │   │   ├── confirm/route.ts     # 确认支付 API
│   │   │   └── orders/route.ts      # 订单列表 API
│   │   └── codes/
│   │       └── verify/route.ts      # 兑换码验证 API
│   ├── pay/page.tsx                 # 支付页面
│   ├── admin/page.tsx               # 管理后台
│   └── redeem/page.tsx              # 兑换页面
├── lib/
│   ├── payment.ts                   # 支付工具函数
│   └── email.ts                     # 邮件发送
├── supabase/
│   └── migration-payment.sql        # 数据库建表 SQL
├── .env.local                       # 环境变量（需自己创建）
└── .env.local.example               # 环境变量模板
```

---

## 2. 准备工作

### 2.1 需要的账号

| 服务 | 用途 | 是否必需 |
|------|------|---------|
| Supabase | 数据库 | ✅ 必需 |
| 微信/支付宝 | 收款码 | ✅ 必需 |
| Resend | 发送邮件 | ⚠️ 可选（开发环境不需要） |

### 2.2 项目已安装的依赖

确认 `package.json` 中包含以下依赖：

```json
{
  "dependencies": {
    "@supabase/ssr": "latest",
    "@supabase/supabase-js": "latest",
    "resend": "^3.x",
    "nanoid": "^5.x"
  }
}
```

如果没有，请先安装：

```bash
npm install resend nanoid --legacy-peer-deps
```

---

## 3. Supabase 数据库配置

### 3.1 登录 Supabase

访问 [https://supabase.com](https://supabase.com) 并登录。

### 3.2 创建项目（如果还没有）

1. 点击 **New Project**
2. 填写项目信息：
   - **Name**: 你的项目名
   - **Database Password**: 设置一个强密码（请保存好）
   - **Region**: 选择离你用户最近的区域
3. 点击 **Create new project**，等待项目创建完成（约2分钟）

### 3.3 获取 API 密钥

1. 在项目左侧菜单，找到 **Settings** → **API**
2. 复制以下信息（后面会用到）：

```
Project URL: https://xxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.4 创建数据库表

1. 在左侧菜单点击 **SQL Editor**
2. 点击 **New query**
3. 复制 `supabase/migration-payment.sql` 文件中的全部内容
4. 粘贴到编辑器中
5. 点击右下角 **Run** 按钮

SQL 内容预览：

```sql
-- 支付订单表
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.01,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'wechat',
  qr_code_url TEXT,
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- 兑换码表
CREATE TABLE IF NOT EXISTS redemption_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES payment_orders(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unused',
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_payment_orders_email ON payment_orders(email);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON redemption_codes(code);
```

### 3.5 验证表创建成功

1. 点击左侧菜单 **Table Editor**
2. 应该能看到两个新表：
   - `payment_orders`
   - `redemption_codes`

---

## 4. 环境变量配置

### 4.1 创建 .env.local 文件

在项目根目录创建 `.env.local` 文件：

```bash
# Windows PowerShell
New-Item -Path ".env.local" -ItemType File

# Windows CMD
type nul > .env.local

# Mac/Linux
touch .env.local
```

### 4.2 填写环境变量

打开 `.env.local`，填入以下内容：

```bash
# ============== Supabase 配置 ==============
# 从 Supabase 项目设置 → API 中复制
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here

# ============== 管理员密钥 ==============
# 设置一个强密码，用于登录管理后台
ADMIN_SECRET_KEY=your-secret-admin-key-12345

# ============== 邮件服务（可选）=============
# 开发环境可以不填，邮件会在控制台打印
# 注册地址: https://resend.com
# RESEND_API_KEY=re_xxxxxxxxxxxxx
# RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**重要提示**：
- 替换 `your-project.supabase.co` 为你的实际 Project URL
- 替换 `your-anon-key-here` 为你的实际 anon/public key
- 修改 `ADMIN_SECRET_KEY` 为一个强密码
- `RESEND_*` 配置可以暂时不填，开发环境不需要

---

## 5. 收款二维码配置

### 5.1 获取收款二维码

**微信支付收款码：**

1. 打开微信
2. 点击右上角 **+** → **收付款**
3. 点击 **二维码收款**
4. 截图或保存收款二维码图片

**支付宝收款码：**

1. 打开支付宝
2. 点击首页的 **收钱**
3. 截图或保存收款二维码图片

### 5.2 上传收款码图片

**方案 A：使用公共图片托管（快速）**

1. 将收款码图片上传到图床（如 [imgur.com](https://imgur.com)）
2. 获取图片的直链 URL
3. 记录这两个 URL

**方案 B：放在项目 public 目录**

```bash
# 在 public 目录下创建 images 文件夹
mkdir -p public/images

# 将收款码图片复制进去，命名为：
# - wechat-qr.png (微信收款码)
# - alipay-qr.png (支付宝收款码)
```

### 5.3 修改代码中的二维码 URL

编辑 `app/pay/page.tsx` 文件，找到第 15-18 行：

```typescript
// 收款二维码 URL（替换成你自己的收款码图片）
const QR_CODES = {
  // 方案A：使用图床 URL
  wechat: 'https://i.imgur.com/your-wechat-qr.png',
  alipay: 'https://i.imgur.com/your-alipay-qr.png',

  // 方案B：使用本地图片（如果放在 public/images/）
  // wechat: '/images/wechat-qr.png',
  // alipay: '/images/alipay-qr.png',
};
```

将 URL 替换为你实际的收款码图片地址。

---

## 6. 邮件服务配置（可选）

### 6.1 开发环境（无需配置）

如果不配置邮件服务，系统会进入 **Mock 模式**：
- 邮件不会真正发送
- 兑换码会在服务器控制台打印
- 适合开发测试

### 6.2 生产环境（配置 Resend）

**步骤：**

1. 访问 [https://resend.com](https://resend.com) 并注册
2. 创建 API Key：
   - 点击 **API Keys** → **Create API Key**
   - 复制生成的 key（格式：`re_xxxxxxxxxxxxx`）
3. 配置发件域名：
   - 点击 **Domains** → **Add Domain**
   - 添加你的域名（如 `mail.yourdomain.com`）
   - 按提示配置 DNS 记录
4. 更新 `.env.local`：

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## 7. 启动项目

### 7.1 安装依赖

```bash
npm install --legacy-peer-deps
```

### 7.2 启动开发服务器

```bash
npm run dev
```

看到以下输出表示启动成功：

```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 2.3s
```

### 7.3 访问页面

| 页面 | URL | 说明 |
|------|-----|------|
| 支付页面 | http://localhost:3000/pay | 用户扫码支付 |
| 管理后台 | http://localhost:3000/admin | 管理员确认收款 |
| 兑换页面 | http://localhost:3000/redeem | 用户使用兑换码 |

---

## 8. 完整使用流程

### 8.1 用户支付流程

**第一步：访问支付页面**

```
http://localhost:3000/pay
```

**第二步：填写信息**

- 输入邮箱地址（用于接收兑换码）
- 选择支付方式（微信支付 / 支付宝）
- 点击「创建订单」

**第三步：扫码支付**

- 页面会显示收款二维码
- 使用微信或支付宝扫码支付
- 支付金额：¥0.01（可在代码中修改）

**第四步：等待确认**

- 页面显示「等待支付中...」
- 系统每 3 秒自动检查一次支付状态
- 最长等待 10 分钟

**第五步：支付完成**

- 状态变为「支付成功！」
- 兑换码已发送到邮箱

---

### 8.2 管理员操作流程

**第一步：访问管理后台**

```
http://localhost:3000/admin
```

**第二步：登录**

- 输入管理员密钥（`.env.local` 中的 `ADMIN_SECRET_KEY`）
- 点击「登录」

**第三步：查看订单**

- 可以看到所有订单列表
- 可以按状态筛选（待支付 / 已支付 / 已过期 / 已取消）

**第四步：确认收款**

当用户完成支付后：

1. 找到对应的待支付订单
2. 核实用户确实已支付（检查微信/支付宝收款记录）
3. 点击「确认收款」按钮
4. 系统自动：
   - 生成唯一兑换码（格式：`ABCD-1234-EFGH-5678`）
   - 更新订单状态为「已支付」
   - 发送邮件到用户邮箱

**第五步：查看兑换码**

- 确认成功后会显示生成的兑换码
- 兑换码也会通过邮件发送给用户

---

### 8.3 兑换码使用流程

**第一步：访问兑换页面**

```
http://localhost:3000/redeem
```

**第二步：输入兑换码**

- 用户输入邮箱中收到的兑换码
- 格式：`ABCD-1234-EFGH-5678`
- 点击「兑换」

**第三步：兑换成功**

- 显示「兑换成功！」
- 兑换码被标记为已使用
- 同一个兑换码不能重复使用

---

## 9. 常见问题

### Q1: 如何修改支付金额？

编辑 `app/api/payment/create/route.ts`，第 18 行：

```typescript
const { email, paymentMethod = 'wechat', amount = 0.01 } = body;
```

同时在 `app/pay/page.tsx` 第 60 行更新显示的金额。

### Q2: 兑换码格式可以自定义吗？

可以。编辑 `lib/payment.ts` 的 `generateRedemptionCode()` 函数：

```typescript
// 生成 12 位随机码，格式化为 XXXX-XXXX-XXXX
const code = nanoid();  // 默认 21 位

// 自定义长度
const nanoid = customAlphabet(chars, 16);  // 改为 16 位
```

### Q3: 如何添加更多支付方式？

1. 修改数据库表，添加新的 payment_method 选项
2. 在 `app/pay/page.tsx` 添加新的支付方式按钮
3. 添加对应的收款码图片

### Q4: 邮件发送失败怎么办？

- 检查 `.env.local` 中的 `RESEND_API_KEY` 是否正确
- 检查发件域名 DNS 配置是否正确
- 查看服务器控制台的错误日志
- 开发环境可以暂时不配置，使用 Mock 模式

### Q5: 如何部署到生产环境？

**使用 Vercel 部署：**

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 在 Vercel 项目设置中添加环境变量
4. 部署完成后，使用 Vercel 提供的域名

**环境变量清单（生产环境）：**

```bash
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxx
ADMIN_SECRET_KEY=xxx（强密码）
RESEND_API_KEY=xxx
RESEND_FROM_EMAIL=xxx
```

### Q6: 订单轮询多久停止？

默认 10 分钟后自动停止。可以在 `app/pay/page.tsx` 第 132 行修改：

```typescript
// 10分钟后停止轮询
setTimeout(() => {
  clearInterval(interval);
  setPolling(false);
}, 600000);  // 这里是毫秒，600000 = 10分钟
```

### Q7: 如何添加订单自动过期功能？

可以在 Supabase 设置一个定时任务，或者创建一个 API 端点手动检查过期订单。

---

## 附录：完整配置示例

### .env.local 完整示例

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYWFhYWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAxNTU1NTU1NX0.xxx

# 管理员密钥（请修改！）
ADMIN_SECRET_KEY=mySecureAdminKey2024!@#

# 邮件服务（生产环境配置）
RESEND_API_KEY=re_abcdefghijklmnopqrstuvwxyz123456
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

如有问题，请检查：
1. Supabase 表是否创建成功
2. 环境变量是否填写正确
3. 收款码图片 URL 是否可访问
4. 浏览器控制台是否有错误信息
