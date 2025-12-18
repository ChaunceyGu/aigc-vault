"""
权限数据模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Permission(Base):
    """权限模型"""
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)  # 权限名称，如 'log.create'
    display_name = Column(String(200), nullable=False)  # 显示名称，如 '创建记录'
    description = Column(Text, nullable=True)  # 权限描述
    category = Column(String(50), nullable=False, index=True)  # 权限分类，如 'log', 'user', 'system'
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # 关联关系
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Permission(id={self.id}, name='{self.name}', category='{self.category}')>"

