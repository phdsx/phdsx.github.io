@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-RestMethod -Uri 'http://127.0.0.1:8770/api/shutdown' -Method Post -TimeoutSec 3 | Out-Null; Write-Host '品牌黑名单本地服务已停止。' } catch { Write-Host '服务当前没有运行。' }"
timeout /t 2 /nobreak >nul
endlocal
