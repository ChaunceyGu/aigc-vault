"""
应用配置
"""
import os
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    """应用配置类"""
    
    # 应用基础配置
    APP_NAME: str = "AIGC Asset Vault"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # 数据库配置
    # psycopg3 需要使用 postgresql+psycopg:// 前缀（不是 postgresql://）
    _db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/aigc_vault"
    )
    # 如果用户提供的是 postgresql://，自动转换为 postgresql+psycopg://
    if _db_url.startswith("postgresql://") and not _db_url.startswith("postgresql+psycopg://"):
        _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    DATABASE_URL: str = _db_url
    
    # RustFS/S3 配置
    RUSTFS_ENDPOINT_URL: str = os.getenv("RUSTFS_ENDPOINT_URL", "http://localhost:9900")
    RUSTFS_ACCESS_KEY: str = os.getenv("RUSTFS_ACCESS_KEY", "")
    RUSTFS_SECRET_KEY: str = os.getenv("RUSTFS_SECRET_KEY", "")
    RUSTFS_BUCKET: str = os.getenv("RUSTFS_BUCKET", "aigcvault")
    RUSTFS_REGION: str = os.getenv("RUSTFS_REGION", "us-east-1")  # MinIO 通常使用 us-east-1
    RUSTFS_USE_SSL: bool = os.getenv("RUSTFS_USE_SSL", "false").lower() == "true"
    
    # CORS 配置
    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000"
    ).split(",")
    
    # 文件上传配置
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "50")) * 1024 * 1024  # 默认 50MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    
    # 缩略图配置
    THUMBNAIL_SIZE: int = int(os.getenv("THUMBNAIL_SIZE", "300"))
    THUMBNAIL_QUALITY: int = int(os.getenv("THUMBNAIL_QUALITY", "85"))
    
    # 编辑密码配置（可选）
    EDIT_PASSWORD: Optional[str] = os.getenv("EDIT_PASSWORD", None)
    
    # JWT 配置
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 默认 24 小时
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

