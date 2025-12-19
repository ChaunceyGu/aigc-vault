"""
用户认证 API
处理注册、登录、获取当前用户信息
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import timedelta

from app.database import get_db
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.utils.auth import create_access_token, get_current_user, security
from app.utils.captcha import generate_captcha, verify_captcha
from app.config import settings

router = APIRouter()


class CaptchaResponse(BaseModel):
    """验证码响应"""
    captcha_id: str
    question: str


class UserRegister(BaseModel):
    """用户注册请求"""
    username: str
    password: str
    email: Optional[EmailStr] = None
    captcha_id: str
    captcha_answer: str
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError('用户名至少需要 3 个字符')
        if len(v) > 50:
            raise ValueError('用户名不能超过 50 个字符')
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('密码至少需要 6 个字符')
        return v


class UserLogin(BaseModel):
    """用户登录请求"""
    username: str
    password: str
    captcha_id: str
    captcha_answer: str


class TokenResponse(BaseModel):
    """Token 响应"""
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    """用户信息响应"""
    id: int
    username: str
    email: Optional[str] = None
    roles: List[str] = []  # 角色名称列表
    is_active: bool
    created_at: str
    
    class Config:
        from_attributes = True


@router.get("/captcha", response_model=CaptchaResponse)
async def get_captcha():
    """获取验证码"""
    captcha_id, question, _ = generate_captcha()
    return CaptchaResponse(
        captcha_id=captcha_id,
        question=question
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """用户注册"""
    # 验证验证码
    if not verify_captcha(user_data.captcha_id, user_data.captcha_answer):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误或已过期，请刷新验证码后重试"
        )
    
    # 检查用户名是否已存在
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 检查邮箱是否已存在（如果提供了邮箱）
    if user_data.email:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已被注册"
            )
    
    # 创建新用户（默认分配普通用户角色）
    hashed_password = User.hash_password(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_active=True
    )
    db.add(new_user)
    db.flush()
    
    # 分配默认角色（普通用户）
    default_role = db.query(Role).filter(Role.name == 'user').first()
    if default_role:
        db.add(UserRole(user_id=new_user.id, role_id=default_role.id))
    db.commit()
    db.refresh(new_user)
    
    # 重新加载用户以获取角色关系
    new_user = db.query(User).options(
        joinedload(User.user_roles).joinedload(UserRole.role)
    ).filter(User.id == new_user.id).first()
    
    # 生成 token（sub 必须是字符串）
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "roles": [ur.role.name for ur in new_user.user_roles],
            "is_active": new_user.is_active
        }
    )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """用户登录"""
    # 验证验证码
    if not verify_captcha(user_data.captcha_id, user_data.captcha_answer):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误或已过期，请刷新验证码后重试"
        )
    
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not user.verify_password(user_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用"
        )
    
    # 重新加载用户以获取角色关系
    user = db.query(User).options(
        joinedload(User.user_roles).joinedload(UserRole.role)
    ).filter(User.id == user.id).first()
    
    # 生成 token（sub 必须是字符串）
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "roles": [ur.role.name for ur in user.user_roles],
            "is_active": user.is_active
        }
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户信息"""
    # 确保角色关系已加载
    user = db.query(User).options(
        joinedload(User.user_roles).joinedload(UserRole.role)
    ).filter(User.id == current_user.id).first()
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        roles=[ur.role.name for ur in user.user_roles],
        is_active=user.is_active,
        created_at=user.created_at.isoformat()
    )

