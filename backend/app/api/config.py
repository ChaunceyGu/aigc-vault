"""
配置 API
提供应用配置信息（如版本信息等）
"""
from fastapi import APIRouter
from app.main import get_version_info

router = APIRouter()


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

