@echo off
chcp 65001 >nul
cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║              WordsAI - GitHub 推送向导                    ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo 你的 GitHub 仓库: https://github.com/jiangsi12304/wordsai.git
echo.

echo ────────────────────────────────────────────────────────────
echo.
echo 推送代码的两种方法:
echo.
echo 方法一: 使用 GitHub CLI (推荐)
echo ────────────────────────────────────────────────────────
echo   1. 安装 GitHub CLI:
echo      winget install --id GitHub.cli
echo.
   2. 登录 GitHub:
echo      gh auth login
echo.
   3. 推送代码:
echo      gh repo create jiangsi12304/wordsai --public --source=.
echo.
echo ────────────────────────────────────────────────────────
echo.
echo 方法二: 手动配置认证
echo ────────────────────────────────────────────────────────
echo   1. 确保已在 GitHub 创建仓库
echo   2. 运行以下命令配置认证:
echo.
echo      git config --global credential.helper store
echo.
echo   3. 推送代码:
echo      git push -u origin main
echo.
echo ────────────────────────────────────────────────────────
echo.
echo 方法三: 使用 Token
echo ────────────────────────────────────────────────────────
   1. 在 GitHub 创建 Personal Access Token:
echo      - Settings → Developer settings → Personal access tokens
echo      - Generate new token → 选择 repo 权限
echo.
   2. 使用 Token 推送:
echo      git remote set-url origin https://YOUR_TOKEN@github.com/jiangsi12304/wordsai.git
echo      git push -u origin main
echo.

set /p CHOICE="请选择方法 (1/2/3 或按 Enter 跳过): "

if "%CHOICE%"=="1" (
    echo.
    echo 正在安装 GitHub CLI...
    winget install --id GitHub.cli --accept-source-agreements
    echo.
    echo 安装完成后，请运行:
    echo   gh auth login
    echo   gh repo create jiangsi12304/wordsai --public --source=.
    echo.
)

echo.
echo ══════════════════════════════════════════════════════════════
echo.
echo 提示: 现在可以打开 GitHub Desktop 或 GitExtensions 推送代码
echo.
echo 或直接访问 Vercel (如果已在 Vercel 连接了 GitHub):
echo   https://vercel.com/import/git
echo.
echo 仓库 URL: https://github.com/jiangsi12304/wordsai.git
echo.
pause
