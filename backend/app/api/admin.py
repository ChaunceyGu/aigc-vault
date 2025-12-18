"""
管理员后台 API
处理用户管理、角色管理等功能
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.utils.auth import get_current_user, require_permission

router = APIRouter()


class UserListItem(BaseModel):
    """用户列表项"""
    id: int
    username: str
    email: Optional[str] = None
    roles: List[str] = []  # 角色名称列表
    is_active: bool
    created_at: str
    
    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    """更新用户请求"""
    role_names: Optional[List[str]] = None  # 角色名称列表
    is_active: Optional[bool] = None


class UserListResponse(BaseModel):
    """用户列表响应"""
    data: List[UserListItem]
    total: int
    page: int
    page_size: int


@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("user.view")),
    db: Session = Depends(get_db)
):
    """获取用户列表（仅管理员）"""
    # 构建查询
    query = db.query(User)
    
    # 搜索过滤
    if search:
        query = query.filter(
            or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%") if User.email else False
            )
        )
    
    # 角色过滤（通过 user_roles 关联表）
    if role:
        query = query.join(UserRole).join(Role).filter(Role.name == role)
    
    # 获取总数
    total = query.count()
    
    # 分页查询（使用 joinedload 加载用户角色关系）
    from sqlalchemy.orm import joinedload
    offset = (page - 1) * page_size
    users = query.options(
        joinedload(User.user_roles).joinedload(UserRole.role)
    ).order_by(desc(User.created_at)).offset(offset).limit(page_size).all()
    
    return UserListResponse(
        data=[
            UserListItem(
                id=user.id,
                username=user.username,
                email=user.email,
                roles=[ur.role.name for ur in user.user_roles],
                is_active=user.is_active,
                created_at=user.created_at.isoformat()
            )
            for user in users
        ],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/users/{user_id}", response_model=UserListItem)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_permission("user.view")),
    db: Session = Depends(get_db)
):
    """获取用户详情"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return UserListItem(
        id=user.id,
        username=user.username,
        email=user.email,
        roles=[ur.role.name for ur in user.user_roles],
        is_active=user.is_active,
        created_at=user.created_at.isoformat()
    )


@router.patch("/users/{user_id}", response_model=UserListItem)
async def update_user(
    user_id: int,
    user_data: UserUpdateRequest,
    current_user: User = Depends(require_permission("user.edit")),
    db: Session = Depends(get_db)
):
    """更新用户信息"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 不能修改自己的角色或状态（防止误操作）
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能修改自己的角色或状态"
        )
    
    # 更新角色
    if user_data.role_names is not None:
        # 需要管理用户角色的权限
        if not current_user.has_permission("user.manage_roles"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="没有权限管理用户角色"
            )
        
        # 删除现有角色
        db.query(UserRole).filter(UserRole.user_id == user_id).delete()
        
        # 添加新角色
        if user_data.role_names:
            roles = db.query(Role).filter(Role.name.in_(user_data.role_names)).all()
            role_dict = {r.name: r for r in roles}
            
            for role_name in user_data.role_names:
                if role_name not in role_dict:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"角色不存在: {role_name}"
                    )
                db.add(UserRole(user_id=user_id, role_id=role_dict[role_name].id))
    
    # 更新状态
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    db.commit()
    db.refresh(user)
    
    return UserListItem(
        id=user.id,
        username=user.username,
        email=user.email,
        roles=[ur.role.name for ur in user.user_roles],
        is_active=user.is_active,
        created_at=user.created_at.isoformat()
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_permission("user.delete")),
    db: Session = Depends(get_db)
):
    """删除用户（仅管理员）"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 不能删除自己
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": "用户已删除"}


@router.get("/stats")
async def get_admin_stats(
    current_user: User = Depends(require_permission("user.view")),
    db: Session = Depends(get_db)
):
    """获取管理员统计信息"""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    
    # 统计各角色用户数
    admin_count = db.query(UserRole).join(Role).filter(Role.name == 'admin').count()
    editor_count = db.query(UserRole).join(Role).filter(Role.name == 'editor').count()
    user_count = db.query(UserRole).join(Role).filter(Role.name == 'user').count()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "admin_count": admin_count,
        "editor_count": editor_count,
        "user_count": user_count
    }

