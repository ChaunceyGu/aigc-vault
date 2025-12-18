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

# 获取版本信息
def get_version_info():
    """获取版本信息"""
    import subprocess
    import os
    from pathlib import Path
    
    # 优先从环境变量获取（Docker 构建时注入）
    version = os.getenv('APP_VERSION', '1.0.0')
    git_commit = os.getenv('GIT_COMMIT', '')
    git_tag = os.getenv('GIT_TAG', '')
    build_time = os.getenv('BUILD_TIME', '')
    
    # 如果环境变量没有，尝试从 Git 获取
    if not git_commit or not git_tag:
        try:
            repo_path = Path(__file__).parent.parent.parent
            if not git_commit:
                try:
                    git_commit = subprocess.check_output(
                        ['git', 'rev-parse', 'HEAD'],
                        cwd=repo_path,
                        stderr=subprocess.DEVNULL
                    ).decode('utf-8').strip()[:7]
                except:
                    pass
            
            if not git_tag:
                try:
                    git_tag = subprocess.check_output(
                        ['git', 'describe', '--tags', '--exact-match', 'HEAD'],
                        cwd=repo_path,
                        stderr=subprocess.DEVNULL
                    ).decode('utf-8').strip()
                    if git_tag and version == '1.0.0':
                        version = git_tag.replace('v', '')
                except:
                    pass
        except:
            pass
    
    return {
        'version': version,
        'git_commit': git_commit,
        'git_tag': git_tag,
        'build_time': build_time
    }

app = FastAPI(
    title="AIGC Asset Vault API",
    description="AI 绘图资产归档系统后端 API",
    version=get_version_info()['version']
)

# 应用启动时初始化默认管理员（如果不存在）
@app.on_event("startup")
async def init_default_admin():
    """应用启动时检查并创建默认管理员"""
    try:
        from sqlalchemy.orm import Session
        from app.database import SessionLocal
        from app.models.user import User
        from app.models.role import Role
        from app.models.user_role import UserRole
        import logging
        
        logger = logging.getLogger(__name__)
        db: Session = SessionLocal()
        
        try:
            # 检查是否已存在管理员
            admin_role = db.query(Role).filter(Role.name == 'admin').first()
            if not admin_role:
                logger.warning("admin 角色不存在，跳过默认管理员初始化")
                return
            
            # 检查是否已有管理员用户
            existing_admin = db.query(UserRole).join(Role).filter(Role.name == 'admin').first()
            if existing_admin:
                logger.debug("管理员账号已存在，跳过创建")
                return
            
            # 从环境变量获取默认管理员信息
            default_username = os.getenv('DEFAULT_ADMIN_USERNAME', 'admin')
            default_password = os.getenv('DEFAULT_ADMIN_PASSWORD', 'admin123456')
            default_email = os.getenv('DEFAULT_ADMIN_EMAIL', None)
            
            # 检查用户名是否已存在
            existing_user = db.query(User).filter(User.username == default_username).first()
            if existing_user:
                # 如果用户存在但没有 admin 角色，则添加角色
                has_admin_role = db.query(UserRole).filter(
                    UserRole.user_id == existing_user.id,
                    UserRole.role_id == admin_role.id
                ).first()
                if not has_admin_role:
                    db.add(UserRole(user_id=existing_user.id, role_id=admin_role.id))
                    db.commit()
                    logger.info(f"已为用户 '{default_username}' 添加管理员角色")
                return
            
            # 创建默认管理员账号
            hashed_password = User.hash_password(default_password)
            admin_user = User(
                username=default_username,
                email=default_email,
                hashed_password=hashed_password,
                is_active=True
            )
            db.add(admin_user)
            db.flush()
            
            # 分配管理员角色
            db.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))
            db.commit()
            
            logger.warning(f"⚠️  默认管理员账号已创建！用户名: {default_username}, 密码: {default_password}")
            logger.warning(f"⚠️  请尽快修改默认密码！")
        except Exception as e:
            logger.error(f"初始化默认管理员失败: {e}", exc_info=True)
            db.rollback()
        finally:
            db.close()
    except Exception as e:
        # 如果初始化失败，不影响应用启动
        import logging
        logging.getLogger(__name__).warning(f"默认管理员初始化跳过: {e}")

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
    version_info = get_version_info()
    return JSONResponse({
        "status": "ok",
        "message": "AIGC Asset Vault API is running",
        "version": version_info['version']
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
from app.api import logs, assets, tags, config, auth, favorites, admin, rbac
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
app.include_router(tags.router, prefix="/api/tags", tags=["tags"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["favorites"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(rbac.router, prefix="/api/rbac", tags=["rbac"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

