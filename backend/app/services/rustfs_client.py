"""
RustFS/S3 客户端封装
用于与 S3 兼容的对象存储服务交互（上传、下载、删除文件）

支持 MinIO 和其他 S3 兼容的对象存储
"""
import aioboto3
import logging
import base64
from typing import Optional
from datetime import datetime, timedelta
from app.config import settings

logger = logging.getLogger(__name__)

class RustFSClient:
    """RustFS/S3 客户端（使用 S3 兼容接口）"""
    
    def __init__(self):
        self.endpoint_url = settings.RUSTFS_ENDPOINT_URL
        self.access_key = settings.RUSTFS_ACCESS_KEY
        self.secret_key = settings.RUSTFS_SECRET_KEY
        self.bucket = settings.RUSTFS_BUCKET
        self.region = settings.RUSTFS_REGION
        self.use_ssl = settings.RUSTFS_USE_SSL
        
        # 创建 boto3 session 配置
        self.session = aioboto3.Session()
        
        # S3 客户端配置
        self.s3_config = {
            'service_name': 's3',
            'endpoint_url': self.endpoint_url,
            'aws_access_key_id': self.access_key,
            'aws_secret_access_key': self.secret_key,
            'region_name': self.region,
            'use_ssl': self.use_ssl,
            'verify': False,  # MinIO 通常使用自签名证书，设为 False
        }
    
    def _generate_file_key(self, filename: str) -> str:
        """
        生成文件存储键（路径）
        
        Args:
            filename: 原始文件名
            
        Returns:
            file_key: 存储键，格式: YYYY/MM/DD/uuid-filename
        """
        import uuid
        from pathlib import Path
        
        # 获取文件扩展名
        ext = Path(filename).suffix
        
        # 生成唯一 ID
        unique_id = str(uuid.uuid4())[:8]
        
        # 按日期组织：YYYY/MM/DD/uuid-filename.ext
        now = datetime.now()
        date_path = now.strftime('%Y/%m/%d')
        
        # 清理文件名（移除特殊字符）
        safe_filename = "".join(c for c in filename if c.isalnum() or c in "._-")[:50]
        
        file_key = f"{date_path}/{unique_id}-{safe_filename}"
        return file_key
    
    async def upload_file(
        self, 
        file_content: bytes, 
        filename: str,
        content_type: Optional[str] = None
    ) -> Optional[str]:
        """
        上传文件到 S3 存储
        
        Args:
            file_content: 文件内容（字节）
            filename: 文件名
            content_type: MIME 类型（可选）
            
        Returns:
            file_key: 文件在存储中的键（路径），失败返回 None
        """
        try:
            # 生成存储键
            file_key = self._generate_file_key(filename)
            
            # 确定内容类型
            if not content_type:
                import mimetypes
                content_type, _ = mimetypes.guess_type(filename)
                if not content_type:
                    content_type = 'application/octet-stream'
            
            async with self.session.client(**self.s3_config) as s3:
                # S3 metadata 只支持 ASCII 字符，需要对中文文件名进行编码
                # 使用 base64 编码，保留原始文件名的完整信息
                encoded_filename = base64.b64encode(filename.encode('utf-8')).decode('ascii')
                
                # 上传文件
                await s3.put_object(
                    Bucket=self.bucket,
                    Key=file_key,
                    Body=file_content,
                    ContentType=content_type,
                    Metadata={
                        'original-filename-encoded': encoded_filename,
                        'upload-time': datetime.now().isoformat()
                    }
                )
                
                logger.info(f"文件上传成功: {filename} -> {file_key}")
                return file_key
                        
        except Exception as e:
            logger.error(f"上传文件异常: {e}", exc_info=True)
            return None
    
    async def get_file_url(self, file_key: str, expires_in: int = 3600) -> str:
        """
        获取文件的访问 URL（预签名 URL）
        
        Args:
            file_key: 文件标识符（存储键）
            expires_in: URL 有效期（秒），默认 1 小时
            
        Returns:
            文件的预签名访问 URL
            
        注意：S3 兼容存储通常使用预签名 URL 来访问私有文件
        """
        try:
            import asyncio
            import boto3
            from botocore.config import Config
            
            # 使用同步 boto3 客户端生成预签名 URL（这个操作很快，不需要异步）
            # 在事件循环中运行同步方法
            def _generate_url():
                s3_client = boto3.client(
                    's3',
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region,
                    use_ssl=self.use_ssl,
                    verify=False,
                    config=Config(signature_version='s3v4')
                )
                return s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': self.bucket,
                        'Key': file_key
                    },
                    ExpiresIn=expires_in
                )
            
            loop = asyncio.get_event_loop()
            url = await loop.run_in_executor(None, _generate_url)
            logger.debug(f"生成预签名 URL 成功: {file_key[:50]}...")
            return url
        except Exception as e:
            logger.warning(f"生成预签名 URL 异常: {e}，使用公开 URL")
            # 如果生成预签名 URL 失败，返回直接访问 URL（如果存储桶是公开的）
            fallback_url = f"{self.endpoint_url.rstrip('/')}/{self.bucket}/{file_key}"
            return fallback_url
    
    def get_public_url(self, file_key: str) -> str:
        """
        获取文件的公开访问 URL（如果存储桶是公开的）
        
        Args:
            file_key: 文件标识符
            
        Returns:
            文件的公开访问 URL
        """
        return f"{self.endpoint_url.rstrip('/')}/{self.bucket}/{file_key}"
    
    async def download_file(self, file_key: str) -> Optional[bytes]:
        """
        从 S3 存储下载文件
        
        Args:
            file_key: 文件标识符
            
        Returns:
            文件内容（字节），失败返回 None
        """
        try:
            async with self.session.client(**self.s3_config) as s3:
                response = await s3.get_object(
                    Bucket=self.bucket,
                    Key=file_key
                )
                
                # 读取文件内容
                async with response['Body'] as stream:
                    content = await stream.read()
                    
                logger.info(f"文件下载成功: {file_key}")
                return content
                
        except Exception as e:
            error_code = getattr(e, 'response', {}).get('Error', {}).get('Code', '')
            if error_code == 'NoSuchKey' or 'NoSuchKey' in str(e):
                logger.error(f"文件不存在: {file_key}")
            else:
                logger.error(f"下载文件异常: {e}", exc_info=True)
            return None
    
    async def delete_file(self, file_key: str) -> bool:
        """
        从 S3 存储删除文件
        
        Args:
            file_key: 文件标识符
            
        Returns:
            成功返回 True，失败返回 False
        """
        try:
            async with self.session.client(**self.s3_config) as s3:
                await s3.delete_object(
                    Bucket=self.bucket,
                    Key=file_key
                )
                
                logger.info(f"文件删除成功: {file_key}")
                return True
                
        except Exception as e:
            logger.error(f"删除文件异常: {e}", exc_info=True)
            return False
    
    async def file_exists(self, file_key: str) -> bool:
        """
        检查文件是否存在
        
        Args:
            file_key: 文件标识符
            
        Returns:
            存在返回 True，否则返回 False
        """
        try:
            async with self.session.client(**self.s3_config) as s3:
                await s3.head_object(
                    Bucket=self.bucket,
                    Key=file_key
                )
                return True
        except Exception as e:
            error_code = getattr(e, 'response', {}).get('Error', {}).get('Code', '')
            if error_code == '404' or error_code == 'NoSuchKey':
                return False
            logger.error(f"检查文件存在性异常: {e}")
            return False
    
    async def health_check(self) -> bool:
        """
        检查 S3 存储服务是否可用
        
        Returns:
            可用返回 True，否则返回 False
        """
        try:
            async with self.session.client(**self.s3_config) as s3:
                # 尝试列出存储桶（只需要列表权限）
                await s3.list_objects_v2(
                    Bucket=self.bucket,
                    MaxKeys=1
                )
                return True
        except Exception as e:
            error_code = getattr(e, 'response', {}).get('Error', {}).get('Code', '')
            if error_code == 'NoSuchBucket':
                logger.error(f"存储桶不存在: {self.bucket}")
            else:
                logger.error(f"健康检查异常: {e}")
            return False


# 全局客户端实例
rustfs_client = RustFSClient()
