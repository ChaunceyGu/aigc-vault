#!/bin/bash
# 环境设置脚本

echo "正在设置开发环境..."

# 1. 安装系统依赖
echo "步骤 1: 安装系统依赖..."
sudo apt update
sudo apt install -y python3.12-venv python3-pip

# 2. 创建虚拟环境
echo "步骤 2: 创建 Python 虚拟环境..."
cd "$(dirname "$0")/backend"
rm -rf venv
python3 -m venv venv

# 3. 激活虚拟环境并安装依赖
echo "步骤 3: 安装 Python 依赖..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 4. 安装前端依赖
echo "步骤 4: 安装前端依赖..."
cd ../frontend
if [ -d "node_modules" ]; then
    echo "前端依赖已存在，跳过安装"
else
    npm install
fi

echo "✅ 环境设置完成！"
echo ""
echo "启动后端服务："
echo "  cd backend && ./start.sh"
echo ""
echo "启动前端服务（新终端）："
echo "  cd frontend && npm run dev"

