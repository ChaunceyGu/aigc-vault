#!/bin/bash
# 启动所有服务脚本（后端 + 前端）

cd "$(dirname "$0")"

echo "=========================================="
echo "  AI 绘图资产归档系统 - 启动所有服务"
echo "=========================================="
echo ""

# 检查后端虚拟环境
if [ ! -d "backend/venv" ]; then
    echo "❌ 错误: 后端虚拟环境不存在"
    echo "请先运行: ./setup.sh"
    exit 1
fi

# 检查前端依赖
if [ ! -d "frontend/node_modules" ]; then
    echo "⚠️  前端依赖未安装，正在安装..."
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        exit 1
    fi
    cd ..
    echo "✅ 前端依赖安装完成"
fi

echo ""
echo "正在启动服务..."
echo ""

# 创建日志目录
mkdir -p logs

# 启动后端服务（后台运行）
echo "🚀 启动后端服务 (http://localhost:8000)..."
cd backend
./start.sh > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端服务（后台运行）
echo "🚀 启动前端服务 (http://localhost:5173)..."
cd frontend
./start.sh > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 保存 PID 到文件
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid

echo ""
echo "=========================================="
echo "✅ 所有服务已启动！"
echo ""
echo "后端服务: http://localhost:8000"
echo "前端服务: http://localhost:5173"
echo "API 文档: http://localhost:8000/docs"
echo ""
echo "查看日志:"
echo "  后端: tail -f logs/backend.log"
echo "  前端: tail -f logs/frontend.log"
echo ""
echo "停止服务: ./停止所有服务.sh"
echo "=========================================="

