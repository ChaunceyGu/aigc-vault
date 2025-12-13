"""
输出组数据模型
用于存储每条记录的不同平台&模型组合
"""
from sqlalchemy import Column, Integer, ARRAY, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class OutputGroup(Base):
    """输出组模型"""
    __tablename__ = "log_output_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("gen_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    tools = Column(ARRAY(Text), nullable=True)
    models = Column(ARRAY(Text), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # 关联关系
    log = relationship("GenLog", back_populates="output_groups")
    assets = relationship("LogAsset", back_populates="output_group")
    
    def __repr__(self):
        return f"<OutputGroup(id={self.id}, log_id={self.log_id}, tools={self.tools}, models={self.models})>"

