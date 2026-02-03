# 扫码支付 + 兑换码系统

一个简单的支付系统，用户扫码支付后，管理员确认收款，系统自动生成兑换码并发送到用户邮箱。

## 功能特点

- **用户支付页面** (`/pay`) - 用户输入邮箱，显示收款二维码
- **自动检测支付** - 前端轮询支付状态
- **管理后台** (`/admin`) - 管理员查看订单并确认收款
- **自动发邮件** - 确认后自动生成兑换码并发送邮件
- **兑换页面** (`/redeem`) - 用户输入兑换码使用

## 快速开始

### 1. 配置环境变量

复制 `.env.local.example` 为 `.env.local` 并填写：

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
RESEND_API_KEY=re_xxxxxx  # 可选，用于生产环境
RESEND_FROM_EMAIL=noreply@yourdomain.com
ADMIN_SECRET_KEY=your-secret-key  # 设置一个强密码
```

### 2. 创建数据库表

在 Supabase SQL Editor 中执行 `supabase/migration-payment.sql` 中的 SQL。

### 3. 配置收款二维码

编辑 `app/pay/page.tsx`，将 `QR_CODES` 中的 URL 替换为你的实际收款码：

```typescript
const QR_CODES = {
  wechat: '/images/wechat-qr.png',  // 你的微信收款码
  alipay: '/images/alipay-qr.png',  // 你的支付宝收款码
};
```

### 4. 启动项目

```bash
npm run dev
```

访问：
- 支付页面: http://localhost:3000/pay
- 管理后台: http://localhost:3000/admin
- 兑换页面: http://localhost:3000/redeem

## 使用流程

```
1. 用户访问 /pay，输入邮箱
2. 系统创建订单，显示收款二维码
3. 用户扫码支付（微信/支付宝）
4. 管理员在 /admin 查看订单，确认收款
5. 系统自动生成兑换码，发送邮件到用户邮箱
6. 用户在 /redeem 输入兑换码使用
```

## 邮件配置

### 开发环境
不配置 `RESEND_API_KEY` 时，邮件发送会在控制台打印（mock 模式）

### 生产环境
1. 注册 [Resend](https://resend.com)
2. 获取 API Key
3. 配置 DNS 验证发件域名
4. 填写环境变量

## 安全建议

1. 修改 `ADMIN_SECRET_KEY` 为强密码
2. 生产环境添加用户认证，不要只依赖密钥
3. 收款二维码使用 HTTPS 图片
4. 考虑添加订单过期自动取消机制

## 文件结构

```
├── app/
│   ├── api/
│   │   ├── payment/
│   │   │   ├── create/route.ts      # 创建订单
│   │   │   ├── check/[orderId]/     # 检查支付状态
│   │   │   ├── confirm/route.ts     # 管理员确认支付
│   │   │   └── orders/route.ts      # 获取订单列表
│   │   └── codes/verify/route.ts    # 验证兑换码
│   ├── pay/page.tsx                 # 支付页面
│   ├── admin/page.tsx               # 管理后台
│   └── redeem/page.tsx              # 兑换页面
├── lib/
│   ├── payment.ts                   # 支付工具函数
│   └── email.ts                     # 邮件发送
└── supabase/migration-payment.sql   # 数据库表结构
```
