"""
收藏数据模型
"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Favorite(Base):
    """收藏模型"""
    __tablename__ = "favorites"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    log_id = Column(Integer, ForeignKey("gen_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # 关联关系
    user = relationship("User", back_populates="favorites")
    log = relationship("GenLog", back_populates="favorites")
    
    # 唯一约束：一个用户不能重复收藏同一条记录
    __table_args__ = (
        UniqueConstraint('user_id', 'log_id', name='uq_user_log_favorite'),
    )
    
    def __repr__(self):
        return f"<Favorite(id={self.id}, user_id={self.user_id}, log_id={self.log_id})>"

