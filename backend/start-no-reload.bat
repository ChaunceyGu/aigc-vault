@echo off
REM 启动后端服务脚本（不使用 reload，避免 Windows 子进程问题）
cd /d %~dp0
call venv\Scripts\activate.bat
venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

