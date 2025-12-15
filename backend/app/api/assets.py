"""
资源相关 API
处理文件访问和下载
"""
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.database import get_db
from app.models.log_asset import LogAsset
from app.services.rustfs_client import rustfs_client

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/{file_key:path}/url")
async def get_file_url(
    file_key: str = Path(..., description="文件标识符（可能包含 / 字符）"),
    expires_in: int = 3600,
    db: Session = Depends(get_db)
):
    """
    获取文件的访问 URL（通过 API 代理的 URL，而不是直接返回 RustFS URL）
    
    - **file_key**: 文件标识符（可能包含 / 字符，如 2024/12/13/uuid-filename.jpg）
    - **expires_in**: URL 有效期（秒），默认 3600（此参数保留用于兼容，实际通过 API 代理访问）
    """
    try:
        # FastAPI 会自动解码路径参数，所以这里不需要手动解码
        # 验证文件是否存在（检查数据库）
        asset = db.query(LogAsset).filter(LogAsset.file_key == file_key).first()
        if not asset:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 返回通过 API 代理的 URL，而不是直接返回 RustFS URL
        # 这样外网可以通过 web 端口访问，而不需要暴露 RustFS 端口
        from urllib.parse import quote
        encoded_file_key = quote(file_key, safe='')
        url = f"/api/assets/{encoded_file_key}/stream"
        
        return {
            "file_key": file_key,
            "url": url,
            "expires_in": expires_in
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文件 URL 失败: {str(e)}")


@router.get("/{file_key:path}/stream")
async def stream_file(
    file_key: str = Path(..., description="文件标识符（可能包含 / 字符）"),
    size: Optional[str] = Query(None, description="图片尺寸：'thumb'（缩略图）、'medium'（中等尺寸）、'original'（原图，默认）"),
    db: Session = Depends(get_db)
):
    """
    流式传输文件（用于图片显示）
    通过后端 API 代理访问 RustFS，这样外网可以通过 web 端口访问
    
    - **file_key**: 文件标识符（可能包含 / 字符，如 2024/12/13/uuid-filename.jpg）
    - **size**: 图片尺寸，可选值：'thumb'（缩略图）、'medium'（中等尺寸）、'original'（原图，默认）
    """
    try:
        # FastAPI 会自动解码路径参数，所以这里不需要手动解码
        # 验证文件是否存在（检查数据库）
        asset = db.query(LogAsset).filter(LogAsset.file_key == file_key).first()
        if not asset:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 根据 size 参数选择文件
        if size == 'thumb':
            # 使用缩略图（如果存在）
            # 缩略图 key 格式：thumb_原文件名 或从原 key 推导
            # 这里简化处理，直接使用原图生成缩略图
            file_content = await rustfs_client.download_file(file_key)
            if not file_content:
                raise HTTPException(status_code=404, detail="文件不存在或无法访问")
            
            from app.utils.image_processor import generate_thumbnail
            try:
                file_content = generate_thumbnail(file_content)
                content_type = "image/jpeg"
            except Exception as e:
                logger.warning(f"生成缩略图失败，使用原图: {e}")
                # 如果生成缩略图失败，使用原图
                content_type = "image/jpeg"
                if asset.file_key.endswith('.png'):
                    content_type = "image/png"
                elif asset.file_key.endswith('.webp'):
                    content_type = "image/webp"
                elif asset.file_key.endswith('.gif'):
                    content_type = "image/gif"
        elif size == 'medium':
            # 使用中等尺寸（压缩后的图片）
            file_content = await rustfs_client.download_file(file_key)
            if not file_content:
                raise HTTPException(status_code=404, detail="文件不存在或无法访问")
            
            from app.utils.image_processor import compress_image
            try:
                file_content = compress_image(file_content, max_width=1920, max_height=1920, quality=85)
                content_type = "image/jpeg"
            except Exception as e:
                logger.warning(f"压缩图片失败，使用原图: {e}")
                # 如果压缩失败，使用原图
                content_type = "image/jpeg"
                if asset.file_key.endswith('.png'):
                    content_type = "image/png"
                elif asset.file_key.endswith('.webp'):
                    content_type = "image/webp"
                elif asset.file_key.endswith('.gif'):
                    content_type = "image/gif"
        else:
            # 使用原图
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
        
        # 返回流式响应（优化缓存策略和传输）
        cache_max_age = 31536000 if size in ('thumb', 'medium') else 3600  # 缩略图和中等尺寸缓存1年，原图缓存1小时
        
        headers = {
            "Cache-Control": f"public, max-age={cache_max_age}",
            "ETag": f'"{hash(file_key + str(size))}"',  # ETag 包含 size 参数
        }
        
        # 如果压缩了图片，添加 Content-Length 头（有助于浏览器优化）
        if size in ('thumb', 'medium'):
            headers["Content-Length"] = str(len(file_content))
        
        return Response(
            content=file_content,
            media_type=content_type,
            headers=headers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"流式传输文件失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取文件失败: {str(e)}")


@router.get("/{file_key:path}/download")
async def download_file(
    file_key: str = Path(..., description="文件标识符（可能包含 / 字符）"),
    db: Session = Depends(get_db)
):
    """
    下载文件
    通过后端 API 代理访问 RustFS，这样外网可以通过 web 端口下载
    
    - **file_key**: 文件标识符（可能包含 / 字符，如 2024/12/13/uuid-filename.jpg）
    """
    try:
        # FastAPI 会自动解码路径参数，所以这里不需要手动解码
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

