"""
用户数据模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import bcrypt


class User(Base):
    """用户模型"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # 关联关系
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    user_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    
    def verify_password(self, password: str) -> bool:
        """验证密码"""
        return bcrypt.checkpw(password.encode('utf-8'), self.hashed_password.encode('utf-8'))
    
    @staticmethod
    def hash_password(password: str) -> str:
        """加密密码"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def has_role(self, role_name: str) -> bool:
        """检查用户是否拥有指定角色"""
        return any(ur.role.name == role_name for ur in self.user_roles)
    
    def has_permission(self, permission_name: str) -> bool:
        """检查用户是否拥有指定权限（通过角色）"""
        for user_role in self.user_roles:
            for role_permission in user_role.role.role_permissions:
                if role_permission.permission.name == permission_name:
                    return True
        return False
    
    def get_permissions(self) -> set[str]:
        """获取用户的所有权限"""
        permissions = set()
        for user_role in self.user_roles:
            for role_permission in user_role.role.role_permissions:
                permissions.add(role_permission.permission.name)
        return permissions
    
    def get_roles(self) -> list[str]:
        """获取用户的所有角色名称"""
        return [ur.role.name for ur in self.user_roles]
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"

