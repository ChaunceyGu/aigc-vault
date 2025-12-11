#!/bin/bash

# 数据库备份脚本
# 使用方法: ./scripts/backup_db.sh

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/aigc_vault_${TIMESTAMP}.sql"

# 创建备份目录
mkdir -p "${BACKUP_DIR}"

echo "开始备份数据库..."
echo "备份文件: ${BACKUP_FILE}"

# 检查是否在 Docker 环境中
if docker-compose ps postgres | grep -q "Up"; then
    echo "使用 Docker Compose 备份..."
    docker-compose exec -T postgres pg_dump -U postgres aigc_vault > "${BACKUP_FILE}"
else
    echo "使用本地 PostgreSQL 备份..."
    PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" pg_dump -h localhost -U postgres -d aigc_vault > "${BACKUP_FILE}"
fi

# 压缩备份文件
if command -v gzip &> /dev/null; then
    echo "压缩备份文件..."
    gzip "${BACKUP_FILE}"
    BACKUP_FILE="${BACKUP_FILE}.gz"
fi

echo "✅ 备份完成: ${BACKUP_FILE}"
echo "文件大小: $(du -h "${BACKUP_FILE}" | cut -f1)"

# 清理旧备份（保留最近 7 天）
if [ -d "${BACKUP_DIR}" ]; then
    find "${BACKUP_DIR}" -name "aigc_vault_*.sql*" -mtime +7 -delete
    echo "已清理 7 天前的备份文件"
fi

