@echo off
chcp 65001 >nul
cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║          WordsAI - 一键部署到 Vercel                     ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo 你的 GitHub 仓库: jiangsi12304/wordsai
echo.

echo ────────────────────────────────────────────────────────────
echo.
echo 第一步: 确保 GitHub 仓库已创建
echo ────────────────────────────────────────────────────────
echo   访问: https://github.com/new
echo   - 仓库名: wordsai
   - Public: ✓
   - Create
echo.
echo ────────────────────────────────────────────────────────
echo.
echo 第二步: 推送代码到 GitHub
echo ────────────────────────────────────────────────────────
echo.
echo 由于网络问题，请使用以下方法之一:
echo.
echo 方法 A: 使用 GitHub Desktop
echo   1. 下载: https://desktop.github.com/
echo   2. 登录后 Clone 你的仓库
echo   3. 将代码复制到克隆的文件夹
echo   4. 提交并推送
echo.
echo 方法 B: 使用 Personal Access Token
echo   1. 访问: https://github.com/settings/tokens
echo   2. 点击 "Generate new token (classic)"
echo   3. 勾选 repo 全部权限
echo   4. 生成后复制 token
echo   5. 运行推送脚本: github-push.bat
echo.
echo ────────────────────────────────────────────────────────
echo.
echo 第三步: 部署到 Vercel
echo ────────────────────────────────────────────────────────
echo   选项 A: 使用 Vercel 网页 (推荐)
echo   1. 打开: https://vercel.com/import
echo   2. 点击 GitHub
   3. 授权后选择 wordsai 仓库
echo   4. 点击 Deploy
echo.
echo   选项 B: 使用 Vercel CLI
echo   1. 先登录: vercel login
echo   2. 然后部署: vercel --prod
echo.

echo ────────────────────────────────────────────────────────
echo.
echo 按任意键打开 Vercel 导入页面...
pause >nul

start "" https://vercel.com/import?utm_source=github

echo.
echo Vercel 导入页面已打开
echo 请选择 GitHub 仓库并点击 Deploy
echo.
pause
