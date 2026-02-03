@echo off
chcp 65001 >nul
echo.
echo ══════════════════════════════════════════════════════════════
echo            推送修复到 GitHub
echo ══════════════════════════════════════════════════════════════
echo.
echo 修复内容: react-signature-pad 替换为 react-signature-canvas
echo.
cd /d "%~dp0"
echo 正在推送...
git push
echo.
if %ERRORLEVEL% EQU 0 (
    echo [成功] 推送完成！Vercel 将自动重新部署
) else (
    echo [失败] 推送失败，请检查网络连接
)
echo.
pause
