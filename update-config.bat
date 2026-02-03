@echo off
chcp 65001 >nul
echo ======================================
echo   更新 Capacitor 配置
echo ======================================
echo.

set /p URL="请输入 Vercel 部署 URL (如: https://wordsai-xxx.vercel.app): "

if "%URL%"=="" (
    echo [错误] URL 不能为空
    pause
    exit /b 1
)

echo.
echo 正在更新 capacitor.config.ts...

powershell -Command "(Get-Content capacitor.config.ts) -replace 'url: process.env.CAPACITOR_SERVER_URL', 'url: ''%URL%''' | Set-Content capacitor.config.ts"

echo [OK] 配置已更新
echo.
echo 正在同步 Android 项目...
call npx cap sync android

echo.
echo [OK] 同步完成
echo.
echo ======================================
echo   下一步操作
echo ======================================
echo.
echo 1. 打开 Android Studio:
echo    npm run cap:open:android
echo.
echo 2. 在 Android Studio 中:
echo    - 等待 Gradle 同步完成
echo    - 点击 Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo.
echo 3. APK 输出位置:
echo    android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
