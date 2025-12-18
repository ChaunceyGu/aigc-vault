"""
RBAC 权限管理 API
处理权限、角色的 CRUD 操作
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.user_role import UserRole
from app.utils.auth import get_current_user, require_permission

router = APIRouter()


# ========== 权限相关 ==========

class PermissionResponse(BaseModel):
    """权限响应"""
    id: int
    name: str
    display_name: str
    description: Optional[str] = None
    category: str
    created_at: str
    
    class Config:
        from_attributes = True


@router.get("/permissions", response_model=List[PermissionResponse])
async def list_permissions(
    category: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("role.view")),
    db: Session = Depends(get_db)
):
    """获取权限列表"""
    query = db.query(Permission)
    if category:
        query = query.filter(Permission.category == category)
    permissions = query.order_by(Permission.category, Permission.name).all()
    return [
        PermissionResponse(
            id=p.id,
            name=p.name,
            display_name=p.display_name,
            description=p.description,
            category=p.category,
            created_at=p.created_at.isoformat()
        )
        for p in permissions
    ]


# ========== 角色相关 ==========

class RoleResponse(BaseModel):
    """角色响应"""
    id: int
    name: str
    display_name: str
    description: Optional[str] = None
    is_system: bool
    created_at: str
    updated_at: str
    permissions: List[str] = []  # 权限名称列表
    
    class Config:
        from_attributes = True


class RoleCreateRequest(BaseModel):
    """创建角色请求"""
    name: str
    display_name: str
    description: Optional[str] = None
    permission_names: List[str] = []  # 权限名称列表


class RoleUpdateRequest(BaseModel):
    """更新角色请求"""
    display_name: Optional[str] = None
    description: Optional[str] = None
    permission_names: Optional[List[str]] = None  # 权限名称列表


@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    current_user: User = Depends(require_permission("role.view")),
    db: Session = Depends(get_db)
):
    """获取角色列表"""
    roles = db.query(Role).order_by(desc(Role.created_at)).all()
    result = []
    for role in roles:
        permission_names = [rp.permission.name for rp in role.role_permissions]
        result.append(RoleResponse(
            id=role.id,
            name=role.name,
            display_name=role.display_name,
            description=role.description,
            is_system=role.is_system,
            created_at=role.created_at.isoformat(),
            updated_at=role.updated_at.isoformat(),
            permissions=permission_names
        ))
    return result


@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    current_user: User = Depends(require_permission("role.view")),
    db: Session = Depends(get_db)
):
    """获取角色详情"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="角色不存在"
        )
    permission_names = [rp.permission.name for rp in role.role_permissions]
    return RoleResponse(
        id=role.id,
        name=role.name,
        display_name=role.display_name,
        description=role.description,
        is_system=role.is_system,
        created_at=role.created_at.isoformat(),
        updated_at=role.updated_at.isoformat(),
        permissions=permission_names
    )


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreateRequest,
    current_user: User = Depends(require_permission("role.create")),
    db: Session = Depends(get_db)
):
    """创建角色"""
    # 检查角色名称是否已存在
    existing = db.query(Role).filter(Role.name == role_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="角色名称已存在"
        )
    
    # 创建角色
    new_role = Role(
        name=role_data.name,
        display_name=role_data.display_name,
        description=role_data.description,
        is_system=False
    )
    db.add(new_role)
    db.flush()
    
    # 分配权限
    if role_data.permission_names:
        permissions = db.query(Permission).filter(Permission.name.in_(role_data.permission_names)).all()
        permission_dict = {p.name: p for p in permissions}
        
        for perm_name in role_data.permission_names:
            if perm_name not in permission_dict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"权限不存在: {perm_name}"
                )
            db.add(RolePermission(role_id=new_role.id, permission_id=permission_dict[perm_name].id))
    
    db.commit()
    db.refresh(new_role)
    
    permission_names = [rp.permission.name for rp in new_role.role_permissions]
    return RoleResponse(
        id=new_role.id,
        name=new_role.name,
        display_name=new_role.display_name,
        description=new_role.description,
        is_system=new_role.is_system,
        created_at=new_role.created_at.isoformat(),
        updated_at=new_role.updated_at.isoformat(),
        permissions=permission_names
    )


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_data: RoleUpdateRequest,
    current_user: User = Depends(require_permission("role.edit")),
    db: Session = Depends(get_db)
):
    """更新角色"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="角色不存在"
        )
    
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能修改系统角色"
        )
    
    # 更新基本信息
    if role_data.display_name is not None:
        role.display_name = role_data.display_name
    if role_data.description is not None:
        role.description = role_data.description
    
    # 更新权限
    if role_data.permission_names is not None:
        # 删除现有权限
        db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
        
        # 添加新权限
        if role_data.permission_names:
            permissions = db.query(Permission).filter(Permission.name.in_(role_data.permission_names)).all()
            permission_dict = {p.name: p for p in permissions}
            
            for perm_name in role_data.permission_names:
                if perm_name not in permission_dict:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"权限不存在: {perm_name}"
                    )
                db.add(RolePermission(role_id=role_id, permission_id=permission_dict[perm_name].id))
    
    db.commit()
    db.refresh(role)
    
    permission_names = [rp.permission.name for rp in role.role_permissions]
    return RoleResponse(
        id=role.id,
        name=role.name,
        display_name=role.display_name,
        description=role.description,
        is_system=role.is_system,
        created_at=role.created_at.isoformat(),
        updated_at=role.updated_at.isoformat(),
        permissions=permission_names
    )


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    current_user: User = Depends(require_permission("role.delete")),
    db: Session = Depends(get_db)
):
    """删除角色"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="角色不存在"
        )
    
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除系统角色"
        )
    
    # 检查是否有用户使用此角色
    user_count = db.query(UserRole).filter(UserRole.role_id == role_id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"有 {user_count} 个用户使用此角色，无法删除"
        )
    
    db.delete(role)
    db.commit()
    
    return {"message": "角色已删除"}

