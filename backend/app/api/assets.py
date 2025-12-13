"""
资源相关 API
处理文件访问和下载
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.log_asset import LogAsset
from app.services.rustfs_client import rustfs_client

router = APIRouter()


@router.get("/{file_key}/url")
async def get_file_url(
    file_key: str,
    expires_in: int = 3600,
    db: Session = Depends(get_db)
):
    """
    获取文件的访问 URL（预签名 URL）
    
    - **file_key**: 文件标识符
    - **expires_in**: URL 有效期（秒），默认 3600
    """
    try:
        # 验证文件是否存在（检查数据库）
        asset = db.query(LogAsset).filter(LogAsset.file_key == file_key).first()
        if not asset:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 生成预签名 URL
        url = await rustfs_client.get_file_url(file_key, expires_in=expires_in)
        
        return {
            "file_key": file_key,
            "url": url,
            "expires_in": expires_in
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文件 URL 失败: {str(e)}")

