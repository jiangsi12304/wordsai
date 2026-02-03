@echo off
chcp 65001 >nul
echo ======================================
echo   WordsAI 自动部署脚本
echo ======================================
echo.

echo [1/4] 检查环境...
node -v >nul 2>&1
if errorlevel 1 (
    echo [错误] Node.js 未安装
    pause
    exit /b 1
)
echo [OK] Node.js 已安装

echo.
echo [2/4] 构建项目...
call npm run build
if errorlevel 1 (
    echo [错误] 构建失败
    pause
    exit /b 1
)

echo.
echo [3/4] 检查 Vercel 登录状态...
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo [需要登录] 正在打开浏览器...
    echo 请在浏览器中完成 Vercel 登录
    echo.
    start "" https://vercel.com/login
    echo.
    echo 登录后，请按任意键继续...
    pause >nul
)

echo.
echo [4/4] 部署到 Vercel...
call vercel --prod

echo.
echo ======================================
echo   部署完成！
echo ======================================
echo.
echo 请复制上面的部署 URL，然后运行:
echo   update-config.bat
echo.
pause