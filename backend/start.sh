#!/bin/bash
# 启动后端服务脚本
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "错误: 未找到虚拟环境"
    echo "请先运行: ../setup.sh"
    exit 1
fi

# 使用虚拟环境中的 Python 直接运行
./venv/bin/python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

