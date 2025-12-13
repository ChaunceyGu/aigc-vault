"""
配置 API
提供应用配置信息（如编辑密码、版本信息等）
"""
from fastapi import APIRouter
from app.config import settings
from app.main import get_version_info

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


@router.get("/version")
async def get_version():
    """
    获取应用版本信息
    """
    version_info = get_version_info()
    return {
        "version": version_info['version'],
        "git_commit": version_info['git_commit'],
        "git_tag": version_info['git_tag'],
        "build_time": version_info['build_time']
    }

