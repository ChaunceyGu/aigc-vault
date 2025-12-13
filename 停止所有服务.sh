#!/bin/bash
# 停止所有服务脚本

cd "$(dirname "$0")"

echo "正在停止所有服务..."

# 停止后端服务
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID
        echo "✅ 后端服务已停止 (PID: $BACKEND_PID)"
    else
        echo "⚠️  后端服务进程不存在"
    fi
    rm -f logs/backend.pid
else
    # 如果没有 PID 文件，尝试通过进程名查找
    pkill -f "uvicorn app.main:app" && echo "✅ 后端服务已停止" || echo "⚠️  未找到后端服务进程"
fi

# 停止前端服务
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID
        echo "✅ 前端服务已停止 (PID: $FRONTEND_PID)"
    else
        echo "⚠️  前端服务进程不存在"
    fi
    rm -f logs/frontend.pid
else
    # 如果没有 PID 文件，尝试通过进程名查找
    pkill -f "vite" && echo "✅ 前端服务已停止" || echo "⚠️  未找到前端服务进程"
fi

echo ""
echo "所有服务已停止"

