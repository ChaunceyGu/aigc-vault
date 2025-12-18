"""
认证工具函数
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.user_role import UserRole
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.config import settings

security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建 JWT token"""
    import logging
    logger = logging.getLogger(__name__)
    
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # 检查 JWT_SECRET_KEY 是否配置
    secret_key = settings.JWT_SECRET_KEY
    if not secret_key or secret_key == "your-secret-key-change-this-in-production":
        logger.warning("JWT_SECRET_KEY 使用默认值，生产环境请修改！")
        logger.debug(f"当前 JWT_SECRET_KEY 长度: {len(secret_key) if secret_key else 0}")
    
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=settings.JWT_ALGORITHM)
    
    # 确保返回字符串
    if isinstance(encoded_jwt, bytes):
        encoded_jwt = encoded_jwt.decode('utf-8')
    
    logger.debug(f"生成 token: {encoded_jwt[:20]}... (长度: {len(encoded_jwt)})")
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """验证 JWT token"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # 清理 token（移除可能的空格）
        token = token.strip()
        secret_key = settings.JWT_SECRET_KEY
        logger.debug(f"验证 token，使用密钥长度: {len(secret_key)}")
        payload = jwt.decode(token, secret_key, algorithms=[settings.JWT_ALGORITHM])
        logger.debug(f"Token 验证成功，用户ID: {payload.get('sub')}")
        return payload
    except JWTError as e:
        logger.warning(f"Token 验证失败 (JWTError): {type(e).__name__}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Token 验证异常: {type(e).__name__}: {str(e)}")
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """获取当前登录用户"""
    import logging
    logger = logging.getLogger(__name__)
    
    token = credentials.credentials
    logger.debug(f"验证 token: {token[:20] if len(token) > 20 else token}... (长度: {len(token)})")
    logger.debug(f"使用 JWT_SECRET_KEY 长度: {len(settings.JWT_SECRET_KEY)}")
    
    payload = verify_token(token)
    if payload is None:
        logger.warning(f"Token 验证失败：无效的 token (前20字符: {token[:20] if len(token) > 20 else token})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id_str = payload.get("sub")
    if user_id_str is None:
        logger.warning("Token 验证失败：缺少用户ID")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # sub 是字符串，需要转换为整数
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        logger.warning(f"Token 验证失败：用户ID格式错误 ({user_id_str})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    from sqlalchemy.orm import joinedload
    
    user = db.query(User).options(
        joinedload(User.user_roles).joinedload(UserRole.role).joinedload(Role.role_permissions).joinedload(RolePermission.permission)
    ).filter(User.id == user_id).first()
    
    if user is None:
        logger.warning(f"Token 验证失败：用户不存在 (user_id={user_id})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        logger.warning(f"Token 验证失败：用户已被禁用 (user_id={user_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用",
        )
    
    logger.debug(f"Token 验证成功：用户 {user.username} (id={user.id}), 角色: {user.get_roles()}")
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """获取当前登录用户（可选，未登录时返回 None）"""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def require_permission(permission_name: str):
    """权限检查装饰器工厂"""
    async def permission_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if not current_user.has_permission(permission_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"需要权限: {permission_name}"
            )
        return current_user
    return permission_checker


def require_any_permission(*permission_names: str):
    """检查是否拥有任意一个权限"""
    async def permission_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        for perm in permission_names:
            if current_user.has_permission(perm):
                return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"需要以下权限之一: {', '.join(permission_names)}"
        )
    return permission_checker


def require_all_permissions(*permission_names: str):
    """检查是否拥有所有权限"""
    async def permission_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        for perm in permission_names:
            if not current_user.has_permission(perm):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"需要权限: {perm}"
                )
        return current_user
    return permission_checker

