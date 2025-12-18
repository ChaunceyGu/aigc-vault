"""
生成日志数据模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class GenLog(Base):
    """生成日志模型"""
    __tablename__ = "gen_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    title = Column(String(200), nullable=False, index=True)
    log_type = Column(String(20), nullable=False, index=True)  # 'txt2img' or 'img2img'
    tools = Column(ARRAY(Text), nullable=True)
    models = Column(ARRAY(Text), nullable=True)
    prompt = Column(Text, nullable=True)
    params_note = Column(Text, nullable=True)
    comparison_group_id = Column(Integer, nullable=True, index=True)  # 对比组ID，用于关联同一主题的不同平台模型输出
    is_nsfw = Column(String(10), nullable=True, default='false')  # NSFW标记，'true' 或 'false'
    
    # 关联关系
    assets = relationship("LogAsset", back_populates="log", cascade="all, delete-orphan")
    output_groups = relationship("OutputGroup", back_populates="log", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="log", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<GenLog(id={self.id}, title='{self.title}', type='{self.log_type}')>"

