"""
图片处理工具
用于生成缩略图、验证图片格式等
"""
import io
from PIL import Image
from typing import Tuple, Optional
import logging
from app.config import settings

logger = logging.getLogger(__name__)

def compress_image(
    image_content: bytes,
    max_width: int = 1920,
    max_height: int = 1920,
    quality: int = 85,
    output_format: str = None
) -> Tuple[bytes, str]:
    """
    压缩图片（用于列表显示的中等尺寸）
    
    Args:
        image_content: 原始图片内容（字节）
        max_width: 最大宽度
        max_height: 最大高度
        quality: 图片质量（1-100）
        output_format: 输出格式（'webp' 或 'jpeg'），默认使用配置值
        
    Returns:
        (压缩后的图片内容（字节）, Content-Type)
    """
    output_format = output_format or settings.IMAGE_OUTPUT_FORMAT
    try:
        image = Image.open(io.BytesIO(image_content))
        
        # 对于 GIF 格式，只使用第一帧
        if image.format == 'GIF':
            try:
                image.seek(0)
            except EOFError:
                pass
        
        # 转换为 RGB
        if image.mode in ('RGBA', 'LA', 'P'):
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                if 'transparency' in image.info:
                    image = image.convert('RGBA')
                else:
                    image = image.convert('RGBA')
            if image.mode == 'RGBA':
                rgb_image.paste(image, mask=image.split()[-1])
            else:
                rgb_image.paste(image)
            image = rgb_image
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 计算新尺寸（保持宽高比）
        width, height = image.size
        if width > max_width or height > max_height:
            ratio = min(max_width / width, max_height / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # 保存为指定格式（WebP 或 JPEG）
        output = io.BytesIO()
        if output_format == 'webp':
            # WebP 格式：减少 25-35% 文件大小
            image.save(output, format='WEBP', quality=quality, method=6)  # method=6 是最高压缩质量
            content_type = 'image/webp'
        else:
            # JPEG 格式（兼容旧版本）
            image.save(output, format='JPEG', quality=quality, optimize=True)
            content_type = 'image/jpeg'
        output.seek(0)
        
        compressed_bytes = output.read()
        logger.info(f"图片压缩成功: {width}x{height} -> {image.size[0]}x{image.size[1]}, 格式: {output_format}, 大小: {len(compressed_bytes)} bytes")
        
        return compressed_bytes, content_type
        
    except Exception as e:
        logger.error(f"图片压缩失败: {e}")
        raise ValueError(f"无法压缩图片: {str(e)}")


def generate_thumbnail(
    image_content: bytes,
    size: int = None,
    quality: int = None,
    output_format: str = None
) -> Tuple[bytes, str]:
    """
    生成图片缩略图
    
    Args:
        image_content: 原始图片内容（字节）
        size: 缩略图大小（宽度，保持比例），默认使用配置值
        quality: 图片质量（1-100），默认使用配置值
        output_format: 输出格式（'webp' 或 'jpeg'），默认使用配置值
        
    Returns:
        (缩略图内容（字节）, Content-Type)
        
    Raises:
        ValueError: 如果图片格式不支持或损坏
    """
    output_format = output_format or settings.IMAGE_OUTPUT_FORMAT
    size = size or settings.THUMBNAIL_SIZE
    quality = quality or settings.THUMBNAIL_QUALITY
    
    try:
        # 打开图片
        image = Image.open(io.BytesIO(image_content))
        
        # 对于 GIF 格式，只使用第一帧（静态 GIF 已经是单帧）
        if image.format == 'GIF':
            # 如果 GIF 是动画，seek(0) 会定位到第一帧
            try:
                image.seek(0)
            except EOFError:
                # 如果 seek 失败，说明图片可能有问题，继续使用当前帧
                pass
        
        # 转换为 RGB（如果是 RGBA 或其他格式）
        if image.mode in ('RGBA', 'LA', 'P'):
            # 创建白色背景
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                # 对于调色板模式（包括 GIF），转换为 RGBA 以保留透明度
                if 'transparency' in image.info:
                    image = image.convert('RGBA')
                else:
                    image = image.convert('RGBA')
            if image.mode == 'RGBA':
                rgb_image.paste(image, mask=image.split()[-1])
            else:
                rgb_image.paste(image)
            image = rgb_image
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 计算缩放尺寸（保持宽高比）
        width, height = image.size
        if width > height:
            # 横向图片
            new_width = size
            new_height = int(height * (size / width))
        else:
            # 纵向图片
            new_height = size
            new_width = int(width * (size / height))
        
        # 生成缩略图（使用高质量缩放）
        thumbnail = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # 保存为指定格式（WebP 或 JPEG）
        output = io.BytesIO()
        if output_format == 'webp':
            # WebP 格式：减少 25-35% 文件大小
            thumbnail.save(output, format='WEBP', quality=quality, method=6)  # method=6 是最高压缩质量
            content_type = 'image/webp'
        else:
            # JPEG 格式（兼容旧版本）
            thumbnail.save(output, format='JPEG', quality=quality, optimize=True)
            content_type = 'image/jpeg'
        output.seek(0)
        
        thumbnail_bytes = output.read()
        logger.info(f"缩略图生成成功: {width}x{height} -> {new_width}x{new_height}, 格式: {output_format}, 大小: {len(thumbnail_bytes)} bytes, 原始格式: {image.format}")
        
        return thumbnail_bytes, content_type
        
    except Exception as e:
        logger.error(f"生成缩略图失败: {e}")
        raise ValueError(f"无法处理图片: {str(e)}")


def validate_image(image_content: bytes, filename: str = None) -> Tuple[bool, Optional[str]]:
    """
    验证图片格式和大小
    
    Args:
        image_content: 图片内容（字节）
        filename: 文件名（可选，用于推断类型）
        
    Returns:
        (是否有效, 错误信息)
    """
    # 检查文件大小
    if len(image_content) > settings.MAX_UPLOAD_SIZE:
        max_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
        return False, f"文件过大，最大允许 {max_mb}MB"
    
    # 检查是否为图片
    try:
        # 打开图片
        image = Image.open(io.BytesIO(image_content))
        format_info = image.format  # 在 verify 之前获取格式信息
        image.verify()  # 验证图片完整性（verify 后图片对象不可用，但我们已经获取了格式信息）
        
        # 检查格式
        if format_info:
            format_lower = format_info.lower()
            if format_lower not in ('png', 'jpeg', 'jpg', 'webp', 'gif'):
                return False, f"不支持的图片格式: {format_info}，仅支持 PNG, JPEG, WEBP, GIF"
        else:
            # 如果无法识别格式，尝试通过文件扩展名判断
            if filename:
                ext = filename.lower().split('.')[-1]
                if ext not in ('png', 'jpg', 'jpeg', 'webp', 'gif'):
                    return False, f"不支持的图片格式，仅支持 PNG, JPEG, WEBP, GIF"
            else:
                return False, "无法识别图片格式"
        
        return True, None
        
    except Exception as e:
        return False, f"无效的图片文件: {str(e)}"


def get_image_info(image_content: bytes) -> dict:
    """
    获取图片信息
    
    Args:
        image_content: 图片内容（字节）
        
    Returns:
        包含图片信息的字典 {width, height, format, size}
    """
    try:
        image = Image.open(io.BytesIO(image_content))
        return {
            'width': image.width,
            'height': image.height,
            'format': image.format,
            'size': len(image_content),
            'mode': image.mode
        }
    except Exception as e:
        logger.error(f"获取图片信息失败: {e}")
        return {
            'width': 0,
            'height': 0,
            'format': 'unknown',
            'size': len(image_content),
            'mode': 'unknown'
        }

