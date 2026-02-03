@echo off
chcp 65001 >nul
echo ======================================
echo   WordsAI 本地测试模式
echo ======================================
echo.

echo [1/3] 获取本机 IP 地址...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set LOCAL_IP=%%a
    goto :found
)
:found
echo [OK] 本机 IP: %LOCAL_IP%
echo.

echo [2/3] 更新 Capacitor 配置...
echo 正在配置为本地服务器模式...
echo.

set "CONFIG_URL=http://%LOCAL_IP%:3000"

powershell -Command "(Get-Content capacitor.config.ts) -replace 'url: process.env.CAPACITOR_SERVER_URL', 'url: ''%CONFIG_URL%''' | Set-Content capacitor.config.ts"

echo [OK] 配置已更新
echo [OK] 服务器 URL: %CONFIG_URL%
echo.

echo [3/3] 同步 Android 项目...
call npx cap sync android

echo.
echo ======================================
echo   本地测试模式已配置！
echo ======================================
echo.
echo 接下来:
echo.
echo 1. 启动开发服务器:
echo    npm run dev
echo.
echo 2. 在手机上测试:
echo    - 确保手机和电脑在同一 WiFi
echo    - 运行: npm run cap:open:android
echo    - 在 Android Studio 中构建 APK
echo    - 安装 APK 到手机
echo.
echo 3. 应用会自动连接到: %CONFIG_URL%
echo.
echo 按任意键启动开发服务器...
pause >nul

echo.
echo 正在启动开发服务器...
echo.
echo 服务器启动后，请保持此窗口打开
echo 然后在另一个窗口运行: npm run cap:open:android
echo.
call npm run dev

pause
