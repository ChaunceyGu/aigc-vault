"""
资源相关 API
处理文件访问和下载
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models.log_asset import LogAsset
from app.services.rustfs_client import rustfs_client

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/{file_key}/url")
async def get_file_url(
    file_key: str,
    expires_in: int = 3600,
    db: Session = Depends(get_db)
):
    """
    获取文件的访问 URL（通过 API 代理的 URL，而不是直接返回 RustFS URL）
    
    - **file_key**: 文件标识符
    - **expires_in**: URL 有效期（秒），默认 3600（此参数保留用于兼容，实际通过 API 代理访问）
    """
    try:
        # 验证文件是否存在（检查数据库）
        asset = db.query(LogAsset).filter(LogAsset.file_key == file_key).first()
        if not asset:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 返回通过 API 代理的 URL，而不是直接返回 RustFS URL
        # 这样外网可以通过 web 端口访问，而不需要暴露 RustFS 端口
        url = f"/api/assets/{file_key}/stream"
        
        return {
            "file_key": file_key,
            "url": url,
            "expires_in": expires_in
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文件 URL 失败: {str(e)}")


@router.get("/{file_key}/stream")
async def stream_file(
    file_key: str,
    db: Session = Depends(get_db)
):
    """
    流式传输文件（用于图片显示）
    通过后端 API 代理访问 RustFS，这样外网可以通过 web 端口访问
    
    - **file_key**: 文件标识符
    """
    try:
        # 验证文件是否存在（检查数据库）
        asset = db.query(LogAsset).filter(LogAsset.file_key == file_key).first()
        if not asset:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 从 RustFS 下载文件
        file_content = await rustfs_client.download_file(file_key)
        if not file_content:
            raise HTTPException(status_code=404, detail="文件不存在或无法访问")
        
        # 确定内容类型
        content_type = "image/jpeg"  # 默认
        if asset.file_key.endswith('.png'):
            content_type = "image/png"
        elif asset.file_key.endswith('.webp'):
            content_type = "image/webp"
        elif asset.file_key.endswith('.gif'):
            content_type = "image/gif"
        
        # 返回流式响应
        return Response(
            content=file_content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",  # 缓存 1 小时
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"流式传输文件失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取文件失败: {str(e)}")


@router.get("/{file_key}/download")
async def download_file(
    file_key: str,
    db: Session = Depends(get_db)
):
    """
    下载文件
    通过后端 API 代理访问 RustFS，这样外网可以通过 web 端口下载
    
    - **file_key**: 文件标识符
    """
    try:
        # 验证文件是否存在（检查数据库）
        asset = db.query(LogAsset).filter(LogAsset.file_key == file_key).first()
        if not asset:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 从 RustFS 下载文件
        file_content = await rustfs_client.download_file(file_key)
        if not file_content:
            raise HTTPException(status_code=404, detail="文件不存在或无法访问")
        
        # 确定文件名
        filename = asset.file_key.split('/')[-1] if '/' in asset.file_key else asset.file_key
        
        # 确定内容类型
        content_type = "application/octet-stream"
        if filename.endswith(('.jpg', '.jpeg')):
            content_type = "image/jpeg"
        elif filename.endswith('.png'):
            content_type = "image/png"
        elif filename.endswith('.webp'):
            content_type = "image/webp"
        elif filename.endswith('.gif'):
            content_type = "image/gif"
        
        # 返回下载响应
        return Response(
            content=file_content,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"下载文件失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"下载文件失败: {str(e)}")

