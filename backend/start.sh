#!/bin/bash
# 启动后端服务脚本
cd "$(dirname "$0")"
source venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

