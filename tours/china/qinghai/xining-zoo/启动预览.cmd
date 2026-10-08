@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 西宁野生动物园 - 资料核对版
echo 启动后在浏览器打开终端显示的 Local 地址。按 Ctrl+C 停止。
echo.
where node >nul 2>nul
if %errorlevel% equ 0 (
  node server.mjs %1
) else (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs %1
  ) else (
    echo 未找到 Node.js。请安装 Node.js 18 或以上版本，或按 README 使用 Python 启动。
  )
)
pause
