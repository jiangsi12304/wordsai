@echo off
chcp 65001 >nul
echo ======================================
echo   WordsAI - 推送到 GitHub
echo ======================================
echo.

echo [步骤 1] 在 GitHub 上创建仓库
echo.
echo 1. 在已打开的 GitHub 页面上:
echo    - 仓库名: wordsai-app
echo    - 选择 Public (免费部署需要)
echo    - 不要勾选任何初始化选项
echo    - 点击 "Create repository"
echo.
echo 创建完成后，GitHub 会显示推送命令
echo.

set /p GITHUB_URL="请输入你的 GitHub 仓库 URL (如: https://github.com/username/wordsai-app.git): "

if "%GITHUB_URL%"=="" (
    echo [错误] URL 不能为空
    pause
    exit /b 1
)

echo.
echo [步骤 2] 推送代码到 GitHub
echo.

REM 添加远程仓库
git remote add origin %GITHUB_URL% 2>nul

REM 设置主分支
git branch -M main

echo 正在推送代码...
git push -u origin main

echo.
echo ======================================
echo   推送完成！
echo ======================================
echo.

echo [下一步] 部署到 Vercel
echo.
echo 1. Vercel 部署页面应该已经打开
echo 2. 点击 "Import Git Repository"
echo 3. 选择刚才创建的 wordsai-app 仓库
echo 4. 点击 "Deploy"
echo.

echo 按任意键打开 Vercel 部署页面...
pause >nul

powershell -Command "Start-Process 'https://vercel.com/new'"

pause
