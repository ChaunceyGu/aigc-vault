@echo off
REM 数据库备份脚本 (Windows)
REM 使用方法: scripts\backup_db.bat

setlocal enabledelayedexpansion

set BACKUP_DIR=backups
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\aigc_vault_%TIMESTAMP%.sql

REM 创建备份目录
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo 开始备份数据库...
echo 备份文件: %BACKUP_FILE%

REM 检查是否在 Docker 环境中
docker-compose ps postgres | findstr "Up" >nul
if %errorlevel% == 0 (
    echo 使用 Docker Compose 备份...
    docker-compose exec -T postgres pg_dump -U postgres aigc_vault > "%BACKUP_FILE%"
) else (
    echo 使用本地 PostgreSQL 备份...
    set PGPASSWORD=postgres
    pg_dump -h localhost -U postgres -d aigc_vault > "%BACKUP_FILE%"
)

if exist "%BACKUP_FILE%" (
    echo ✅ 备份完成: %BACKUP_FILE%
    for %%A in ("%BACKUP_FILE%") do echo 文件大小: %%~zA 字节
) else (
    echo ❌ 备份失败
    exit /b 1
)

echo 提示: 建议定期备份数据库，并保存到安全位置

