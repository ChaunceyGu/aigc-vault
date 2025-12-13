"""
数据库连接和会话管理
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# 确保 psycopg3 适配器可用
try:
    # psycopg3 的 SQLAlchemy 适配器
    import psycopg
    # 确保 SQLAlchemy 使用 psycopg3
    # 如果 URL 是 postgresql+psycopg://，SQLAlchemy 会自动使用 psycopg
except ImportError:
    pass  # 如果导入失败，会由 SQLAlchemy 处理错误

# 创建数据库引擎
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明基类
Base = declarative_base()

def get_db():
    """获取数据库会话（依赖注入）"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

