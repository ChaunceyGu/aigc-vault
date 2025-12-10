#!/bin/bash

# Docker Hub 用户名 - 修改这里
DOCKER_USERNAME=YOUR_DOCKERHUB_USERNAME

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}构建和推送镜像到 Docker Hub${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否登录
if ! docker info | grep -q "Username"; then
    echo "⚠️  请先登录 Docker Hub:"
    echo "   docker login"
    exit 1
fi

# 构建后端镜像
echo -e "${GREEN}[1/4] 正在构建后端镜像...${NC}"
docker build -f Dockerfile.backend -t ${DOCKER_USERNAME}/aigc-vault-backend:latest .
if [ $? -ne 0 ]; then
    echo "❌ 后端镜像构建失败"
    exit 1
fi

# 推送后端镜像
echo -e "${GREEN}[2/4] 正在推送后端镜像...${NC}"
docker push ${DOCKER_USERNAME}/aigc-vault-backend:latest
if [ $? -ne 0 ]; then
    echo "❌ 后端镜像推送失败"
    exit 1
fi

# 构建前端镜像
echo -e "${GREEN}[3/4] 正在构建前端镜像...${NC}"
docker build -f Dockerfile.frontend -t ${DOCKER_USERNAME}/aigc-vault-frontend:latest .
if [ $? -ne 0 ]; then
    echo "❌ 前端镜像构建失败"
    exit 1
fi

# 推送前端镜像
echo -e "${GREEN}[4/4] 正在推送前端镜像...${NC}"
docker push ${DOCKER_USERNAME}/aigc-vault-frontend:latest
if [ $? -ne 0 ]; then
    echo "❌ 前端镜像推送失败"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 所有镜像已成功构建并推送到 Docker Hub!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "镜像地址:"
echo "  - ${DOCKER_USERNAME}/aigc-vault-backend:latest"
echo "  - ${DOCKER_USERNAME}/aigc-vault-frontend:latest"
echo ""
echo "记得修改 docker-compose.yml 中的镜像名称!"

