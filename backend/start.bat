@echo off
REM 启动后端服务脚本
cd /d %~dp0
call venv\Scripts\activate.bat
set PYTHONPATH=%CD%
set PYTHONEXECUTABLE=%CD%\venv\Scripts\python.exe
venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

