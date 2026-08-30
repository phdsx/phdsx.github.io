@echo off
setlocal
cd /d "%~dp0"
set "NODE_EXE=node"
where node >nul 2>nul
if not errorlevel 1 goto run_service
set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%NODE_EXE%" goto run_service
echo Node.js 18 or newer is required.
pause
exit /b 1

:run_service
"%NODE_EXE%" "%~dp0scripts\start-brand-blacklist.mjs" %*
set "EXIT_CODE=%errorlevel%"
if not "%EXIT_CODE%"=="0" pause
endlocal & exit /b %EXIT_CODE%
