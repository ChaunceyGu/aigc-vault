@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Docker Hub 用户名 - 修改这里
set DOCKER_USERNAME=Chauncey Gu

echo ========================================
echo 构建和推送镜像到 Docker Hub
echo ========================================
echo.

REM 检查是否登录
docker info | findstr /C:"Username" >nul
if errorlevel 1 (
    echo ⚠️  请先登录 Docker Hub:
    echo    docker login
    exit /b 1
)

REM 构建后端镜像
echo [1/4] 正在构建后端镜像...
docker build -f Dockerfile.backend -t %DOCKER_USERNAME%/aigc-vault-backend:latest .
if errorlevel 1 (
    echo ❌ 后端镜像构建失败
    exit /b 1
)

REM 推送后端镜像
echo [2/4] 正在推送后端镜像...
docker push %DOCKER_USERNAME%/aigc-vault-backend:latest
if errorlevel 1 (
    echo ❌ 后端镜像推送失败
    exit /b 1
)

REM 构建前端镜像
echo [3/4] 正在构建前端镜像...

REM 从 .env 文件读取配置（如果存在）
if exist .env (
    echo 📝 从 .env 文件读取配置...
    REM 读取 VITE_API_BASE_URL（如果存在）
    findstr /C:"VITE_API_BASE_URL" .env >nul
    if not errorlevel 1 (
        for /f "tokens=2 delims==" %%a in ('findstr /C:"VITE_API_BASE_URL" .env') do (
            set VITE_API_BASE_URL=%%a
            set VITE_API_BASE_URL=!VITE_API_BASE_URL:"=!
            set VITE_API_BASE_URL=!VITE_API_BASE_URL:'=!
            echo    使用 VITE_API_BASE_URL=!VITE_API_BASE_URL!
            docker build -f Dockerfile.frontend --build-arg VITE_API_BASE_URL=!VITE_API_BASE_URL! -t %DOCKER_USERNAME%/aigc-vault-frontend:latest .
        )
    ) else (
        docker build -f Dockerfile.frontend -t %DOCKER_USERNAME%/aigc-vault-frontend:latest .
    )
) else (
    echo ⚠️  未找到 .env 文件，使用默认配置
    docker build -f Dockerfile.frontend -t %DOCKER_USERNAME%/aigc-vault-frontend:latest .
)

if errorlevel 1 (
    echo ❌ 前端镜像构建失败
    exit /b 1
)

REM 推送前端镜像
echo [4/4] 正在推送前端镜像...
docker push %DOCKER_USERNAME%/aigc-vault-frontend:latest
if errorlevel 1 (
    echo ❌ 前端镜像推送失败
    exit /b 1
)

echo.
echo ========================================
echo ✅ 所有镜像已成功构建并推送到 Docker Hub!
echo ========================================
echo.
echo 镜像地址:
echo   - %DOCKER_USERNAME%/aigc-vault-backend:latest
echo   - %DOCKER_USERNAME%/aigc-vault-frontend:latest
echo.
echo 记得修改 docker-compose.yml 中的镜像名称!

