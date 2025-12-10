"""
资源附件数据模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class LogAsset(Base):
    """资源附件模型"""
    __tablename__ = "log_assets"
    
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("gen_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    file_key = Column(Text, nullable=False, index=True)
    asset_type = Column(String(20), nullable=False, index=True)  # 'input' or 'output'
    note = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # 关联关系
    log = relationship("GenLog", back_populates="assets")
    
    def __repr__(self):
        return f"<LogAsset(id={self.id}, log_id={self.log_id}, type='{self.asset_type}')>"

