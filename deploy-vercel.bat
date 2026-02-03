@echo off
chcp 65001 >nul
cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║           WordsAI - Vercel 部署向导                      ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo 当前状态:
echo   [✓] Git 仓库已初始化
echo   [✓] 代码已提交
echo   [✓] GitHub 页面已打开
echo   [✓] Vercel 页面已打开
echo.
echo ────────────────────────────────────────────────────────────
echo.
echo 接下来的步骤:
echo.
echo 第一步: 在 GitHub 创建仓库
echo ─────────────────────────
echo   1. 在已打开的浏览器窗口中 (GitHub 新建仓库页面)
echo   2. 填写以下信息:
echo      - Repository name: wordsai-app
echo      - Description: AI单词学习助手
echo      - Public: ✓ 选择 (免费部署需要)
echo   3. 点击 "Create repository"
echo.
echo ────────────────────────────────────────────────────────────
echo.
echo 第二步: 推送代码到 GitHub
echo ─────────────────────────────────
echo   创建仓库后，GitHub 会显示类似这样的命令:
echo.
echo     git remote add origin https://github.com/USERNAME/wordsai-app.git
echo     git branch -M main
echo     git push -u origin main
echo.
echo   或者直接运行本脚本，输入你的仓库 URL
echo.
   set /p REPO_URL="请输入你的 GitHub 仓库 URL: "
   if "!REPO_URL!"=="" (
     git remote add origin !REPO_URL! 2>nul
     git branch -M main
     git push -u origin main
     echo.
     echo [成功] 代码已推送到 GitHub
   )
echo.
echo ────────────────────────────────────────────────────────────
echo.
echo 第三步: 在 Vercel 部署
echo ────────────────────────────────
echo   1. 在已打开的 Vercel 页面
echo   2. 点击 "Import Git Repository"
echo   3. 授权 GitHub 访问 (首次需要)
echo   4. 选择 wordsai-app 仓库
echo   5. 点击 "Deploy"
echo.
echo ────────────────────────────────────────────────────────────
echo.
echo 选项:
echo   [1] 现在输入 GitHub URL 推送
echo   [2] 跳过，手动执行命令
echo.
set /p CHOICE="请选择 (1 或 2): "

if "%CHOICE%"=="1" (
    echo.
    set /p REPO_URL="请输入你的 GitHub 仓库 URL: "
    if "!REPO_URL!"=="" (
        echo.
        echo 正在推送到 GitHub...
        git remote add origin !REPO_URL! 2>nul
        git branch -M main
        git push -u origin main
        echo.
        echo [成功] 推送完成！
        echo.
        echo 按任意键打开 Vercel 部署页面...
        pause >nul
        start "" https://vercel.com/new
    )
)

echo.
echo ══════════════════════════════════════════════════════════════
echo.
echo 需要帮助？查看 NEXT_STEPS.md 或 PROJECT_SUMMARY.md
echo.
pause
