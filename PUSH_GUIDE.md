# GitHub 推送和 Vercel 部署指南

## 📋 你的信息

- **GitHub 仓库**: https://github.com/jiangsi12304/wordsai.git
- **项目目录**: `C:\Users\24246\.claude\ai-project\with-supabase-app`

---

## 🚀 方法一：使用 GitHub Desktop (最简单)

### 1. 安装 GitHub Desktop
```
https://desktop.github.com/
```

### 2. 登录 GitHub 账号

### 3. 克隆仓库
- 点击 "File" → "Clone repository"
- URL: `https://github.com/jiangsi12304/wordsai.git`
- 本地路径选择: `C:\Users\24246\.claude\ai-project\with-supabase-app`

### 4. 推送代码
- 在 GitHub Desktop 中会自动检测到更改
- 点击 "Commit to main"
- 点击 "Push origin"

---

## 🚀 方法二：使用 GitHub CLI

```bash
# 1. 安装 GitHub CLI (Windows)
winget install --id GitHub.cli

# 2. 登录
gh auth login

# 3. 推送
cd C:\Users\24246\.claude\ai-project\with-supabase-app
gh repo set-default jiangsi12304/wordsai
git push -u origin main
```

---

## 🚀 方法三：使用 Token

### 1. 创建 Personal Access Token

1. 访问: https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选: `repo` (全部)
4. 点击 "Generate token"
5. **复制 token** (只显示一次!)

### 2. 推送代码

```bash
cd C:\Users\24246\.claude\ai-project\with-supabase-app

# 添加远程仓库
git remote add origin https://YOUR_TOKEN@github.com/jiangsi12304/wordsai.git

# 推送
git push -u origin main
```

---

## 🚀 方法四：使用 GitExtensions (VSCode)

### 1. 安装 GitExtensions VSCode 扩展

### 2. 打开 VSCode
```bash
code C:\Users\24246\.claude\ai-project\with-supabase-app
```

### 3. 在 VSCode 中
- 点击 "Initialize Repository"
- 点击 "Publish to GitHub"
- 选择 `jiangsi12304/wordsai`

---

## 🎯 Vercel 部署 (代码已在 GitHub 后)

### 方式 A: Vercel 网页

1. 访问: https://vercel.com/import
2. 点击 "GitHub"
3. 授权 Vercel 访问你的 GitHub
4. 选择 `wordsai-app` 仓库
5. 点击 "Deploy"

### 方式 B: Vercel CLI

```bash
# 等待 GitHub CLI 安装完成后
gh auth login
npm run deploy:vercel
```

---

## 📱 部署后更新 Capacitor 配置

部署完成后，Vercel 会返回 URL，如:
```
https://wordsai-xxx.vercel.app
```

### 更新配置

1. 打开 `capacitor.config.ts`
2. 修改 `server.url`:
   ```typescript
   server: {
     url: 'https://wordsai-xxx.vercel.app',  // 替换为实际 URL
   }
   ```

3. 同步 Android 项目:
   ```bash
   npm run cap:sync:android
   ```

4. 打开 Android Studio 构建 APK:
   ```bash
   npm run cap:open:android
   ```

---

## ⚠️ 推送问题解决

### 错误: "Connection was reset"

**原因**: 网络不稳定或需要认证

**解决**:
1. 尝试使用 GitHub Desktop
2. 或使用 Personal Access Token
3. 或使用 VPN

### 错误: "Repository not found"

**原因**: 仓库还没在 GitHub 上创建

**解决**:
1. 访问: https://github.com/new
2. 创建 `wordsai-app` 仓库
3. 然后再推送

### 错误: "Authentication failed"

**解决**:
1. 检查用户名和仓库名是否正确
2. 使用 Personal Access Token

---

## ✅ 快速检查清单

- [ ] GitHub 仓库已创建
- [ ] 本地代码已提交
- [ ] 远程仓库已配置
- [ ] 代码已推送到 GitHub
- [ ] Vercel 部署完成
- [ ] Capacitor 配置已更新
- [ ] Android 项目已同步
- [ ] APK 已构建
