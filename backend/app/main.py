"""
AI 绘图资产归档系统 - 主应用入口
"""
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

app = FastAPI(
    title="AIGC Asset Vault API",
    description="AI 绘图资产归档系统后端 API",
    version="1.0.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 自定义验证错误处理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """处理请求验证错误，提供更友好的错误信息"""
    errors = exc.errors()
    error_messages = []
    friendly_message = None
    
    # 先检查是否有特殊错误需要友好提示
    log_type = None
    try:
        form_data = await request.form()
        log_type = form_data.get("log_type")
    except:
        pass
    
    # 检查是否有 input_files 相关的错误
    for error in errors:
        field = " -> ".join(str(loc) for loc in error.get("loc", []))
        msg = str(error.get("msg", ""))  # 确保是字符串
        error_type = error.get("type", "")
        
        # 特殊处理：如果是 input_files 相关的错误
        if "input_files" in field and error_type == "value_error" and log_type == "txt2img":
            friendly_message = "txt2img 模式不需要 input_files 参数，请移除该参数后再试"
        
        # 如果是 output_files 错误
        if "output_files" in field and error_type == "value_error":
            friendly_message = "output_files 必须是文件，不能是字符串。请使用 @文件名 格式，如：-F 'output_files=@image.png'"
        
        # 转换错误信息为可序列化的格式
        error_input = error.get("input")
        error_dict = {
            "field": field,
            "message": msg,
            "type": error_type
        }
        # 安全地序列化 input（如果是复杂对象，转换为字符串）
        if error_input is not None:
            try:
                # 尝试直接使用，如果无法序列化则转换为字符串
                if isinstance(error_input, (str, int, float, bool, type(None))):
                    error_dict["input"] = error_input
                else:
                    error_dict["input"] = str(error_input)
            except:
                error_dict["input"] = str(type(error_input))
        
        error_messages.append(error_dict)
    
    # 返回友好的错误信息
    response_content = {
        "detail": friendly_message if friendly_message else "请求验证失败",
        "errors": error_messages
    }
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response_content
    )

@app.get("/")
async def root():
    """健康检查"""
    return JSONResponse({
        "status": "ok",
        "message": "AIGC Asset Vault API is running",
        "version": "1.0.0"
    })

@app.get("/api/health")
async def health_check():
    """详细健康检查"""
    try:
        from sqlalchemy import text
        from app.database import engine
        from app.services.rustfs_client import rustfs_client
    except Exception as e:
        return JSONResponse({
            "status": "error",
            "database": f"import error: {str(e)[:100]}",
            "rustfs": "not checked",
            "timestamp": datetime.now().isoformat()
        })
    
    # 检查数据库连接
    db_status = "disconnected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)[:50]}"
    
    # 检查 RustFS/S3 连接
    rustfs_status = "disconnected"
    try:
        is_healthy = await rustfs_client.health_check()
        rustfs_status = "connected" if is_healthy else "unreachable"
    except Exception as e:
        rustfs_status = f"error: {str(e)[:50]}"
    
    overall_status = "healthy" if db_status == "connected" and rustfs_status == "connected" else "degraded"
    
    return JSONResponse({
        "status": overall_status,
        "database": db_status,
        "rustfs": rustfs_status,
        "timestamp": datetime.now().isoformat()
    })

# 导入路由模块
from app.api import logs, assets, tags
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
app.include_router(tags.router, prefix="/api/tags", tags=["tags"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

