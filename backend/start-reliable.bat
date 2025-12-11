@echo off
REM 可靠的启动脚本 - 直接使用虚拟环境的 Python
cd /d %~dp0

REM 设置环境变量
set PYTHONPATH=%CD%
set VIRTUAL_ENV=%CD%\venv

REM 直接使用虚拟环境的 Python，不使用 reload（避免 Windows 子进程问题）
venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

REM 如果需要热重载，可以手动重启服务，或者使用 watchfiles
REM venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --reload-dir app

