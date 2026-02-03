# 部署修复指南

## 问题
Vercel 部署失败，原因是 `react-signature-pad@0.0.6` 与 React 19 不兼容。

## 已修复
- ✅ 将 `react-signature-pad` 替换为 `react-signature-canvas`
- ✅ 更新了 `handwriting-board.tsx` 组件
- ✅ 删除了旧的类型定义
- ✅ 本地已提交 (commit: 5fad2f5)

## 推送到 GitHub

### 方法 1: 双击运行脚本
双击运行 `push-fix.bat`

### 方法 2: 命令行
```bash
cd C:\Users\24246\.claude\ai-project\with-supabase-app
git push
```

### 方法 3: GitHub Desktop
1. 打开 GitHub Desktop
2. 选择 wordsai 仓库
3. 点击 "Push origin"

### 方法 4: 使用 GitHub CLI
```bash
cd C:\Users\24246\.claude\ai-project\with-supabase-app
"C:\Program Files\GitHub CLI\gh.exe" auth login
"C:\Program Files\GitHub CLI\gh.exe" repo push
```

## 推送后
Vercel 会自动检测到新的 commit 并重新部署。
