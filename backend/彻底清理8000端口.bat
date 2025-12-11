@echo off
chcp 65001 >nul
echo ========================================
echo 彻底清理占用 8000 端口的进程
echo ========================================
echo.

REM 停止所有 Python 进程（谨慎使用）
echo 正在查找所有 Python 进程...
for /f "tokens=2" %%a in ('tasklist ^| findstr /i "python.exe"') do (
    echo 发现 Python 进程 PID: %%a
    taskkill /PID %%a /F /T >nul 2>&1
    if !errorlevel! == 0 (
        echo   ✓ 已停止进程 %%a
    )
)

echo.
echo 正在查找占用 8000 端口的进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo 发现占用 8000 端口的进程 PID: %%a
    taskkill /PID %%a /F /T >nul 2>&1
    if !errorlevel! == 0 (
        echo   ✓ 已停止进程 %%a
    ) else (
        echo   ✗ 停止进程 %%a 失败（可能已不存在）
    )
)

echo.
echo 等待 3 秒让连接释放...
timeout /t 3 >nul

echo.
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% == 0 (
    echo ⚠️  警告：端口 8000 仍被占用
    echo 请检查以下进程：
    netstat -ano | findstr :8000 | findstr LISTENING
    echo.
    echo 建议：重启计算机或检查是否有 Docker 容器在使用该端口
) else (
    echo ✅ 端口 8000 已完全释放
    echo 现在可以启动后端服务了：
    echo   start-no-reload.bat
)

echo.
pause

