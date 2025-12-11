@echo off
chcp 65001 >nul
echo 正在清理占用 8000 端口的进程...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo 停止进程 PID: %%a
    taskkill /PID %%a /F /T >nul 2>&1
)

timeout /t 2 >nul
echo.
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% == 0 (
    echo ⚠️  端口 8000 仍被占用，请检查任务管理器
) else (
    echo ✅ 端口 8000 已释放
)

