@echo off
chcp 65001 >nul
echo ========================================
echo 检查 8000 端口占用情况
echo ========================================
echo.

echo [1] 检查网络连接...
netstat -ano | findstr :8000
if %errorlevel% == 0 (
    echo   发现占用 8000 端口的连接
) else (
    echo   ✓ 端口 8000 未被占用
)

echo.
echo [2] 检查 Python 进程...
tasklist | findstr /i "python.exe"
if %errorlevel% == 0 (
    echo   发现 Python 进程正在运行
) else (
    echo   ✓ 没有 Python 进程运行
)

echo.
echo [3] 检查 Docker 容器...
docker ps --filter "publish=8000" 2>nul
if %errorlevel% == 0 (
    echo   发现 Docker 容器占用 8000 端口
) else (
    echo   ✓ 没有 Docker 容器占用 8000 端口
)

echo.
pause

