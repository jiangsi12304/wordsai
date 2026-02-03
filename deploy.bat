@echo off
REM WordsAI Windows 部署脚本

echo ======================================
echo   WordsAI 移动应用部署脚本
echo ======================================
echo.

REM 检查 Node.js
echo 1. 检查环境...
node -v >nul 2>&1
if errorlevel 1 (
    echo [错误] Node.js 未安装
    pause
    exit /b 1
)

echo [OK] Node.js:
node -v
echo [OK] npm:
npm -v
echo.

REM 构建项目
echo 2. 构建项目...
call npm run build
if errorlevel 1 (
    echo [错误] 构建失败
    pause
    exit /b 1
)
echo [OK] 构建完成
echo.

REM 检查 Vercel CLI
vercel -v >nul 2>&1
if errorlevel 1 (
    echo 3. 安装 Vercel CLI...
    call npm install -g vercel
    echo [OK] Vercel CLI 安装完成
    echo.
    echo 请运行以下命令后重新执行此脚本:
    echo   vercel login
    echo.
    pause
    exit /b 0
)

REM 部署到 Vercel
echo ======================================
echo 3. 部署到 Vercel...
echo ======================================
call vercel --prod
echo.

echo ======================================
echo 4. 同步 Capacitor 项目...
echo ======================================
echo.

if exist android (
    echo 同步 Android 项目...
    call npx cap sync android
    echo [OK] Android 同步完成
    echo.
    echo 构建步骤:
    echo   1. 安装 JDK 17
    echo   2. cd android
    echo   3. gradlew assembleDebug
    echo.
    echo 或在 Android Studio 中打开项目:
    echo   npm run cap:open:android
) else (
    echo [警告] Android 项目未找到，请先运行:
    echo   npx cap add android
)

echo.
echo ======================================
echo   部署流程完成！
echo ======================================
echo.
echo 部署 URL: 请从上面的输出中复制
echo.
echo 下一步:
echo   1. 更新 capacitor.config.ts 中的 url
echo   2. 运行: npm run cap:sync:android
echo.
pause
