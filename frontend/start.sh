#!/bin/bash
# 启动前端服务脚本
cd "$(dirname "$0")"

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "⚠️  未找到 node_modules，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败，请检查网络连接和 npm 配置"
        exit 1
    fi
    echo "✅ 依赖安装完成"
fi

# 检查 package.json 是否存在
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到 package.json"
    exit 1
fi

echo "🚀 启动前端开发服务器..."
npm run dev

