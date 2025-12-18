"""
收藏 API
处理收藏的添加、删除、查询
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.favorite import Favorite
from app.models.gen_log import GenLog
from app.models.log_asset import LogAsset
from app.models.output_group import OutputGroup
from app.utils.auth import get_current_user
from app.api.logs import get_proxy_url

router = APIRouter()


class FavoriteResponse(BaseModel):
    """收藏响应"""
    id: int
    log_id: int
    created_at: str
    log: dict
    
    class Config:
        from_attributes = True


@router.post("/{log_id}", status_code=status.HTTP_201_CREATED)
async def add_favorite(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """添加收藏"""
    # 检查记录是否存在
    log = db.query(GenLog).filter(GenLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="记录不存在"
        )
    
    # 检查是否已收藏
    existing_favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.log_id == log_id
    ).first()
    if existing_favorite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="已收藏此记录"
        )
    
    # 创建收藏
    favorite = Favorite(
        user_id=current_user.id,
        log_id=log_id
    )
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    
    return {"message": "收藏成功", "id": favorite.id}


@router.delete("/{log_id}")
async def remove_favorite(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """取消收藏"""
    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.log_id == log_id
    ).first()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未收藏此记录"
        )
    
    db.delete(favorite)
    db.commit()
    
    return {"message": "取消收藏成功"}


@router.get("/check/{log_id}")
async def check_favorite(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """检查是否已收藏"""
    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.log_id == log_id
    ).first()
    
    return {"is_favorited": favorite is not None}


@router.get("/")
async def get_favorites(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取收藏列表"""
    # 查询收藏记录总数
    total = db.query(Favorite).filter(Favorite.user_id == current_user.id).count()
    
    # 查询收藏记录
    offset = (page - 1) * page_size
    favorites = db.query(Favorite).filter(
        Favorite.user_id == current_user.id
    ).order_by(desc(Favorite.created_at)).offset(offset).limit(page_size).all()
    
    # 获取关联的日志信息
    log_ids = [f.log_id for f in favorites]
    if not log_ids:
        return {
            "data": [],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    
    logs = db.query(GenLog).filter(GenLog.id.in_(log_ids)).all()
    log_dict = {log.id: log for log in logs}
    
    # 批量查询 assets 和 output_groups
    assets = db.query(LogAsset).filter(LogAsset.log_id.in_(log_ids)).all()
    output_groups = db.query(OutputGroup).filter(OutputGroup.log_id.in_(log_ids)).all()
    
    # 组织 assets 和 output_groups 数据
    assets_dict = {}
    for asset in assets:
        if asset.log_id not in assets_dict:
            assets_dict[asset.log_id] = []
        assets_dict[asset.log_id].append(asset)
    
    output_groups_dict = {}
    for group in output_groups:
        if group.log_id not in output_groups_dict:
            output_groups_dict[group.log_id] = []
        output_groups_dict[group.log_id].append(group)
    
    # 构建响应数据
    result = []
    for favorite in favorites:
        log = log_dict.get(favorite.log_id)
        if not log:
            continue
        
        # 获取封面图（优先使用 output 类型的 assets）
        cover_url = None
        output_assets = [a for a in assets_dict.get(log.id, []) if a.asset_type == 'output']
        if output_assets:
            cover_url = get_proxy_url(output_assets[0].file_key, size='medium')
        elif log.assets:
            cover_url = get_proxy_url(log.assets[0].file_key, size='medium')
        
        # 获取预览图列表
        preview_urls = []
        if output_assets:
            preview_urls = [get_proxy_url(asset.file_key, size='medium') for asset in output_assets[:3]]
        elif log.assets:
            preview_urls = [get_proxy_url(asset.file_key, size='medium') for asset in log.assets[:3]]
        
        result.append({
            "id": favorite.id,
            "log_id": log.id,
            "created_at": favorite.created_at.isoformat(),
            "log": {
                "id": log.id,
                "title": log.title,
                "log_type": log.log_type,
                "tools": log.tools or [],
                "models": log.models or [],
                "prompt": log.prompt,
                "is_nsfw": log.is_nsfw == 'true',
                "cover_url": cover_url,
                "preview_urls": preview_urls,
                "created_at": log.created_at.isoformat()
            }
        })
    
    return {
        "data": result,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/count")
async def get_favorite_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取收藏总数"""
    count = db.query(Favorite).filter(Favorite.user_id == current_user.id).count()
    return {"count": count}

