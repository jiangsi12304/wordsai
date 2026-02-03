#!/bin/bash
# WordsAI 一键部署脚本

set -e

echo "======================================"
echo "  WordsAI 移动应用部署脚本"
echo "======================================"
echo ""

# 检查环境
echo "1. 检查环境..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

echo "✅ Node.js: $(node -v)"
echo "✅ npm: $(npm -v)"
echo ""

# 构建项目
echo "2. 构建项目..."
npm run build
echo "✅ 构建完成"
echo ""

# 检查是否安装了 Vercel CLI
if command -v vercel &> /dev/null; then
    echo "3. 部署到 Vercel..."
    vercel --prod
    echo "✅ 部署完成"
    echo ""
else
    echo "3. 安装 Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI 安装完成"
    echo ""
    echo "请运行 'vercel login' 登录后，再执行 'vercel --prod' 部署"
    exit 0
fi

# 获取部署的 URL
echo ""
echo "======================================"
echo "4. 更新 Capacitor 配置..."
echo "======================================"
echo ""
echo "请在 Vercel 获取部署 URL 后，更新 capacitor.config.ts:"
echo ""
echo "url: 'https://your-app.vercel.app',"
echo ""
echo "然后运行: npm run cap:sync:android"
echo ""

# 同步 Capacitor
echo "======================================"
echo "5. 同步 Capacitor 项目..."
echo "======================================"
echo ""

if [ -d "android" ]; then
    echo "同步 Android 项目..."
    npm run cap:sync:android
    echo "✅ Android 同步完成"
    echo ""
    echo "构建 Debug APK:"
    echo "  cd android && ./gradlew assembleDebug"
    echo ""
    echo "或在 Android Studio 中打开:"
    echo "  npm run cap:open:android"
fi

echo ""
echo "======================================"
echo "✅ 部署流程完成！"
echo "======================================"
