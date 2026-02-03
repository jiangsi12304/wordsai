# WordsAI

> AI 单词学习助手 - 声纹验证 + 艾宾浩斯记忆法

## ✨ 功能特点

- **🎤 声纹验证** - 语音跟读验证发音
- **📚 艾宾浩斯记忆** - 科学复习间隔算法
- **🤖 AI 聊天** - 单词拟人化对话学习
- **📝 手写练习** - 书写记忆强化
- **💎 会员订阅** - Premium/Flagship 套餐

## 🚀 快速开始

### 开发模式
```bash
npm run dev
```

### 本地测试模式 (手机 + 同WiFi)

**Windows 用户**:
```bash
# 自动配置并启动
local-test.bat
```

**手动配置**:
1. 获取本机 IP (运行 `ipconfig`)
2. 修改 `capacitor.config.ts` 中的 URL
3. 运行 `npm run dev`
4. 同步: `npm run cap:sync:android`

### 部署到 Vercel

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录并部署
vercel login
vercel --prod
```

## 📱 移动应用

### 构建 Android APK

```bash
# 打开 Android Studio
npm run cap:open:android

# 在 Android Studio 中:
# Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### 已配置的脚本

| 脚本 | 功能 |
|------|------|
| `local-test.bat` | 本地WiFi测试模式 |
| `auto-deploy.bat` | 自动部署到Vercel |
| `update-config.bat` | 更新服务器配置 |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |

## 📖 文档

- [NEXT_STEPS.md](NEXT_STEPS.md) - 部署步骤指南
- [DEPLOYMENT.md](DEPLOYMENT.md) - 完整部署文档
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - 项目总结

## 🔧 环境变量

复制 `.env.local.example` 到 `.env.local` 并填写:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key
ADMIN_SECRET_KEY=admin123456
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=onboarding@resend.dev
```

## 📋 套餐价格

| 套餐 | 月付 | 年付 | 终身 |
|------|------|------|------|
| Premium | ¥3 | ¥5 | - |
| Flagship | ¥10 | ¥15 | ¥20 |

## 📄 License

MIT
