"""
配置 API
提供应用配置信息（如编辑密码等）
"""
from fastapi import APIRouter
from app.config import settings

router = APIRouter()


@router.get("/edit-password")
async def get_edit_password():
    """
    获取编辑密码配置
    如果未配置密码，返回空字符串（表示不需要密码）
    """
    return {
        "password": settings.EDIT_PASSWORD or ""
    }

