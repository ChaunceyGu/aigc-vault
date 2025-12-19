"""
生成日志 API
处理记录的创建、查询、更新、删除
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional, Union
import logging

from app.database import get_db
from app.models.gen_log import GenLog
from app.models.log_asset import LogAsset
from app.models.output_group import OutputGroup
from app.models.user import User
from app.services.rustfs_client import rustfs_client
from app.utils.image_processor import generate_thumbnail, validate_image
from app.utils.cache import cache
from app.utils.auth import require_permission, get_current_user_optional
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


def get_proxy_url(file_key: str, size: str = None) -> str:
    """
    生成通过 API 代理的文件访问 URL
    这样外网可以通过 web 端口访问，而不需要暴露 RustFS 端口
    
    Args:
        file_key: 文件标识符
        size: 图片尺寸，可选值：'thumb'（缩略图）、'medium'（中等尺寸）、None（原图）
        
    Returns:
        通过 API 代理的 URL
    """
    from urllib.parse import quote
    # URL 编码 file_key，确保特殊字符（如 /、% 等）被正确编码
    encoded_file_key = quote(file_key, safe='')
    url = f"/api/assets/{encoded_file_key}/stream"
    if size:
        url += f"?size={size}"
    return url


@router.post("/")
async def create_log(
    request: Request,
    title: str = Form(...),
    log_type: str = Form(...),
    prompt: Optional[str] = Form(None),
    params_note: Optional[str] = Form(None),
    is_nsfw: Optional[str] = Form(None, description="是否为NSFW内容，'true' 或 'false'"),
    input_files: List[UploadFile] = File(default=[]),
    input_notes: Optional[str] = Form(None, description="输入图片备注，JSON 格式：{'filename1': 'note1', ...}"),
    output_groups: Optional[str] = Form(None, description="输出组JSON，格式：[{'tools': ['tool1'], 'models': ['model1'], 'file_count': 2}, ...]，文件按组顺序排列"),
    output_files: List[UploadFile] = File(default=[]),  # 改为可选，因为可能通过output_groups传递
    current_user: User = Depends(require_permission("log.create")),
    db: Session = Depends(get_db)
):
    """
    创建新的生成记录
    
    - **title**: 标题（必填）
    - **log_type**: 类型，'txt2img' 或 'img2img'（必填）
    - **prompt**: 提示词
    - **params_note**: 参数记录
    - **input_files**: 输入图片（仅 img2img 模式需要）
    - **input_notes**: 输入图片备注，JSON 字符串
    - **output_groups**: 输出组JSON（必填），每个组包含工具、模型和文件数量
    - **output_files**: 输出图片（必填），按组的顺序排列
    """
    try:
        # 验证类型
        if log_type not in ('txt2img', 'img2img'):
            raise HTTPException(status_code=400, detail="log_type 必须是 'txt2img' 或 'img2img'")
        
        # 对于 txt2img，忽略 input_files（即使传递了也忽略）
        if log_type == 'txt2img':
            input_files = []
        
        # 处理 input_files：过滤掉无效的文件对象
        logger.info(f"🔍 接收到的 input_files: 类型={type(input_files)}, 是否为列表={isinstance(input_files, list)}, 长度={len(input_files) if isinstance(input_files, list) else 'N/A'}")
        
        if input_files:
            logger.info(f"📁 input_files 列表详情:")
            for i, f in enumerate(input_files):
                logger.info(f"  文件 {i}: 类型={type(f)}, filename={getattr(f, 'filename', 'N/A')}, size={getattr(f, 'size', 'N/A')}")
            
            # 过滤掉不是有效 UploadFile 的对象
            # 注意：UploadFile 实际类型是 starlette.datastructures.UploadFile
            valid_files = []
            for f in input_files:
                # 检查是否有 filename 属性，并且 filename 不为空
                # 不依赖 isinstance 检查，因为类型可能是 starlette.datastructures.UploadFile
                filename = getattr(f, 'filename', None)
                if filename and filename.strip():
                    valid_files.append(f)
                    logger.info(f"✅ 有效文件: {filename}")
                else:
                    logger.warning(f"❌ 跳过无效文件对象: 类型={type(f)}, filename={filename}")
            input_files = valid_files
            logger.info(f"📊 过滤后的有效文件数量: {len(input_files)}")
        else:
            logger.warning(f"⚠️  input_files 为空或 None")
        
        # 解析输出组（JSON 格式）
        import json
        output_groups_list = []
        if output_groups:
            try:
                output_groups_list = json.loads(output_groups)
                if not isinstance(output_groups_list, list):
                    raise HTTPException(status_code=400, detail="output_groups 必须是数组格式")
            except json.JSONDecodeError as e:
                raise HTTPException(status_code=400, detail=f"无法解析 output_groups JSON: {str(e)}")
        
        if not output_groups_list:
            raise HTTPException(status_code=400, detail="至少需要一个输出组")
        
        # 验证输出组和文件数量是否匹配
        total_file_count = sum(group.get('file_count', 0) for group in output_groups_list)
        if len(output_files) != total_file_count:
            raise HTTPException(status_code=400, detail=f"输出文件数量不匹配：期望 {total_file_count} 个文件，实际 {len(output_files)} 个")
        
        # 解析输入备注（JSON 格式）
        input_notes_dict = {}
        if input_notes:
            try:
                input_notes_dict = json.loads(input_notes)
            except json.JSONDecodeError:
                logger.warning(f"无法解析 input_notes JSON: {input_notes}")
        
        # 处理is_nsfw参数
        is_nsfw_value = 'false'
        if is_nsfw and is_nsfw.lower() == 'true':
            is_nsfw_value = 'true'
        
        # 创建日志记录（不再存储tools和models，因为现在在output_groups中）
        log = GenLog(
            title=title,
            log_type=log_type,
            tools=None,  # 不再在主表存储
            models=None,  # 不再在主表存储
            prompt=prompt,
            params_note=params_note,
            comparison_group_id=None,  # 不再使用对比组功能
            is_nsfw=is_nsfw_value
        )
        db.add(log)
        db.flush()  # 获取 ID
        
        # 处理输入文件（仅 img2img 模式）
        logger.info(f"创建记录 - log_type: {log_type}, input_files数量: {len(input_files) if input_files else 0}, input_files类型: {type(input_files)}")
        if log_type == 'img2img' and input_files:
            logger.info(f"开始处理输入文件，数量: {len(input_files)}")
            for idx, file in enumerate(input_files):
                # 读取文件内容
                content = await file.read()
                
                # 验证图片
                is_valid, error_msg = validate_image(content, file.filename)
                if not is_valid:
                    raise HTTPException(status_code=400, detail=f"输入图片验证失败 ({file.filename}): {error_msg}")
                
                # 上传原图
                original_key = await rustfs_client.upload_file(
                    content,
                    file.filename,
                    file.content_type
                )
                if not original_key:
                    raise HTTPException(status_code=500, detail=f"上传输入图片失败: {file.filename}")
                
                # 生成并上传缩略图
                try:
                    thumbnail_content, thumbnail_content_type = generate_thumbnail(content)
                    thumbnail_key = await rustfs_client.upload_file(
                        thumbnail_content,
                        f"thumb_{file.filename}",
                        thumbnail_content_type
                    )
                except Exception as e:
                    logger.warning(f"生成缩略图失败: {e}，使用原图")
                    thumbnail_key = original_key
                
                # 获取备注（如果有）
                note = input_notes_dict.get(file.filename, '')
                
                # 创建资源记录
                asset = LogAsset(
                    log_id=log.id,
                    file_key=original_key,
                    asset_type='input',
                    note=note,
                    sort_order=idx
                )
                db.add(asset)
                logger.info(f"已添加输入资源记录: file_key={original_key}, note={note}, sort_order={idx}")
        
        # 处理输出组和输出文件
        file_index = 0
        for group_idx, group_data in enumerate(output_groups_list):
            # 解析组的工具和模型
            group_tools = group_data.get('tools', [])
            group_models = group_data.get('models', [])
            file_count = group_data.get('file_count', 0)
            
            # 创建输出组
            output_group = OutputGroup(
                log_id=log.id,
                tools=group_tools if group_tools else None,
                models=group_models if group_models else None,
                sort_order=group_idx
            )
            db.add(output_group)
            db.flush()  # 获取组ID
            
            # 处理该组的输出文件
            for file_offset in range(file_count):
                if file_index >= len(output_files):
                    raise HTTPException(status_code=400, detail=f"输出文件数量不足：组 {group_idx + 1} 需要 {file_count} 个文件")
                
                file = output_files[file_index]
                file_index += 1
                
                # 读取文件内容
                content = await file.read()
                
                # 验证图片
                is_valid, error_msg = validate_image(content, file.filename)
                if not is_valid:
                    raise HTTPException(status_code=400, detail=f"输出图片验证失败 ({file.filename}): {error_msg}")
                
                # 上传原图
                original_key = await rustfs_client.upload_file(
                    content,
                    file.filename,
                    file.content_type
                )
                if not original_key:
                    raise HTTPException(status_code=500, detail=f"上传输出图片失败: {file.filename}")
                
                # 生成并上传缩略图
                try:
                    thumbnail_content, thumbnail_content_type = generate_thumbnail(content)
                    thumbnail_key = await rustfs_client.upload_file(
                        thumbnail_content,
                        f"thumb_{file.filename}",
                        thumbnail_content_type
                    )
                except Exception as e:
                    logger.warning(f"生成缩略图失败: {e}，使用原图")
                    thumbnail_key = original_key
                
                # 创建资源记录，关联到输出组
                asset = LogAsset(
                    log_id=log.id,
                    file_key=original_key,
                    asset_type='output',
                    output_group_id=output_group.id,
                    sort_order=file_offset
                )
                db.add(asset)
        
        # 提交事务
        db.commit()
        db.refresh(log)
        
        logger.info(f"创建记录成功: ID={log.id}, title={title}")
        
        # 清除相关缓存
        cache.clear("tags:")  # 清除标签相关缓存
        cache.clear("logs_")  # 清除列表缓存
        
        return {
            "id": log.id,
            "title": log.title,
            "log_type": log.log_type,
            "comparison_group_id": log.comparison_group_id,  # 返回对比组ID，用于后续记录加入
            "created_at": log.created_at.isoformat(),
            "is_nsfw": log.is_nsfw == 'true' if log.is_nsfw else False  # 转换为布尔值
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"创建记录失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"创建记录失败: {str(e)}")


@router.get("/")
async def list_logs(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    log_type: Optional[str] = None,
    tool: Optional[str] = None,
    model: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    获取记录列表（分页）
    
    - **page**: 页码（从 1 开始）
    - **page_size**: 每页数量
    - **search**: 搜索标题关键词
    - **log_type**: 筛选类型
    - **tool**: 筛选工具标签
    - **model**: 筛选模型标签
    """
    try:
        # 构建缓存键
        cache_key = f"logs_list_{page}_{page_size}_{search or ''}_{log_type or ''}_{tool or ''}_{model or ''}"
        
        # 尝试从缓存获取（缓存1分钟）
        cached_result = cache.get(cache_key)
        if cached_result:
            logger.debug(f"缓存命中: {cache_key}")
            return cached_result
        query = db.query(GenLog)
        
        # 标题搜索
        if search:
            query = query.filter(GenLog.title.ilike(f"%{search}%"))
        
        # 类型筛选
        if log_type:
            query = query.filter(GenLog.log_type == log_type)
        
        # 标签筛选（从输出组表筛选）
        if tool:
            # 使用 PostgreSQL 的 ANY 操作符，但需要转义单引号防止 SQL 注入
            if all(c.isalnum() or c in ' ._-' for c in tool):
                from sqlalchemy import text
                tool_escaped = tool.replace("'", "''")
                # 从输出组表筛选，或从主表筛选（兼容旧数据）
                query = query.filter(
                    text(f"""
                        EXISTS (
                            SELECT 1 FROM log_output_groups 
                            WHERE log_output_groups.log_id = gen_logs.id 
                            AND '{tool_escaped}' = ANY(log_output_groups.tools)
                        )
                        OR ('{tool_escaped}' = ANY(gen_logs.tools))
                    """)
                )
            else:
                query = query.filter(text("1=0"))
        
        if model:
            if all(c.isalnum() or c in ' ._-' for c in model):
                from sqlalchemy import text
                model_escaped = model.replace("'", "''")
                # 从输出组表筛选，或从主表筛选（兼容旧数据）
                query = query.filter(
                    text(f"""
                        EXISTS (
                            SELECT 1 FROM log_output_groups 
                            WHERE log_output_groups.log_id = gen_logs.id 
                            AND '{model_escaped}' = ANY(log_output_groups.models)
                        )
                        OR ('{model_escaped}' = ANY(gen_logs.models))
                    """)
                )
            else:
                query = query.filter(text("1=0"))
        
        # 排序：最新的在前
        query = query.order_by(desc(GenLog.created_at))
        
        # 分页
        total = query.count()
        logs = query.offset((page - 1) * page_size).limit(page_size).all()
        
        # 优化：批量查询所有相关的 assets 和 output_groups，避免 N+1 查询
        log_ids = [log.id for log in logs]
        
        # 批量查询所有 output 图片
        all_output_assets = db.query(LogAsset).filter(
            LogAsset.log_id.in_(log_ids),
            LogAsset.asset_type == 'output'
        ).order_by(LogAsset.sort_order).all()
        
        # 按 log_id 分组
        assets_by_log_id: dict[int, list] = {}
        for asset in all_output_assets:
            if asset.log_id not in assets_by_log_id:
                assets_by_log_id[asset.log_id] = []
            assets_by_log_id[asset.log_id].append(asset)
        
        # 批量查询所有输出组
        all_output_groups = db.query(OutputGroup).filter(
            OutputGroup.log_id.in_(log_ids)
        ).order_by(OutputGroup.sort_order).all()
        
        # 按 log_id 分组
        groups_by_log_id: dict[int, list] = {}
        for group in all_output_groups:
            if group.log_id not in groups_by_log_id:
                groups_by_log_id[group.log_id] = []
            groups_by_log_id[group.log_id].append(group)
        
        # 获取封面图和输出图片信息
        result = []
        for log in logs:
            # 从批量查询的结果中获取
            output_assets = assets_by_log_id.get(log.id, [])
            output_groups = groups_by_log_id.get(log.id, [])
            
            # 合并所有组的工具和模型（去重）
            all_tools = set()
            all_models = set()
            for group in output_groups:
                if group.tools:
                    all_tools.update(group.tools)
                if group.models:
                    all_models.update(group.models)
            
            # 如果没有输出组（兼容旧数据），从主表获取
            if not output_groups and log.tools:
                all_tools.update(log.tools)
            if not output_groups and log.models:
                all_models.update(log.models)
            
            # 生成封面图 URL（第一张图片）和多张图片的预览 URL
            cover_url = None
            preview_urls: list[str] = []
            
            # 获取前几张图片的 URL（最多4张，用于预览）
            # 使用 API 代理 URL，这样外网可以通过 web 端口访问
            # 列表显示使用中等尺寸图片（1920px，质量85%），减少传输量
            for asset in output_assets[:4]:
                url = get_proxy_url(asset.file_key, size='medium')  # 使用中等尺寸，减少传输量
                preview_urls.append(url)
                if not cover_url:  # 第一张作为封面
                    cover_url = url
            
            result.append({
                "id": log.id,
                "title": log.title,
                "log_type": log.log_type,
                "tools": list(all_tools),  # 所有组的工具合并
                "models": list(all_models),  # 所有组的模型合并
                "cover_url": cover_url,
                "output_count": len(output_assets),  # 输出图片总数
                "preview_urls": preview_urls,  # 前几张预览图（最多4张）
                "created_at": log.created_at.isoformat(),
                "is_nsfw": log.is_nsfw == 'true' if log.is_nsfw else False  # 转换为布尔值
            })
        
        result_data = {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": result
        }
        
        # 缓存结果（1分钟）
        cache.set(cache_key, result_data, 60)
        
        return result_data
        
    except Exception as e:
        logger.error(f"获取记录列表失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取列表失败: {str(e)}")


@router.get("/{log_id}")
async def get_log(log_id: int, db: Session = Depends(get_db)):
    """
    获取单条记录详情
    """
    try:
        log = db.query(GenLog).filter(GenLog.id == log_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="记录不存在")
        
        # 获取关联的资源
        assets = db.query(LogAsset).filter(
            LogAsset.log_id == log_id
        ).order_by(LogAsset.sort_order).all()
        
        logger.info(f"获取记录详情 - log_id: {log_id}, 总资源数: {len(assets)}")
        for asset in assets:
            logger.info(f"资源: id={asset.id}, asset_type={asset.asset_type}, file_key={asset.file_key}")
        
        # 分离输入资源
        input_assets = []
        for asset in assets:
            if asset.asset_type == 'input':
                # 使用 API 代理 URL
                asset_url = get_proxy_url(asset.file_key)
                
                input_assets.append({
                    "id": asset.id,
                    "file_key": asset.file_key,
                    "url": asset_url,
                    "note": asset.note,
                    "sort_order": asset.sort_order
                })
        
        # 获取输出组并按组组织输出图片
        output_groups_data = []
        output_groups = db.query(OutputGroup).filter(
            OutputGroup.log_id == log_id
        ).order_by(OutputGroup.sort_order).all()
        
        for group in output_groups:
            # 获取该组的输出图片
            group_assets = db.query(LogAsset).filter(
                LogAsset.log_id == log_id,
                LogAsset.asset_type == 'output',
                LogAsset.output_group_id == group.id
            ).order_by(LogAsset.sort_order).all()
            
            group_output_assets = []
            for asset in group_assets:
                # 使用 API 代理 URL
                asset_url = get_proxy_url(asset.file_key)
                
                group_output_assets.append({
                    "id": asset.id,
                    "file_key": asset.file_key,
                    "url": asset_url,
                    "sort_order": asset.sort_order
                })
            
            output_groups_data.append({
                "id": group.id,
                "tools": group.tools or [],
                "models": group.models or [],
                "assets": group_output_assets
            })
        
        # 如果没有输出组（兼容旧数据），将所有输出图片放在一个默认组中
        if not output_groups_data:
            all_output_assets = db.query(LogAsset).filter(
                LogAsset.log_id == log_id,
                LogAsset.asset_type == 'output'
            ).order_by(LogAsset.sort_order).all()
            
            if all_output_assets:
                default_group_assets = []
                for asset in all_output_assets:
                    # 使用 API 代理 URL
                    asset_url = get_proxy_url(asset.file_key)
                    
                    default_group_assets.append({
                        "id": asset.id,
                        "file_key": asset.file_key,
                        "url": asset_url,
                        "sort_order": asset.sort_order
                    })
                
                # 从主表获取工具和模型（兼容旧数据）
                output_groups_data.append({
                    "id": None,
                    "tools": log.tools or [],
                    "models": log.models or [],
                    "assets": default_group_assets
                })
        
        logger.info(f"返回详情 - input_assets数量: {len(input_assets)}, output_groups数量: {len(output_groups_data)}")
        
        return {
            "id": log.id,
            "title": log.title,
            "log_type": log.log_type,
            "prompt": log.prompt if log.prompt else None,
            "params_note": log.params_note if log.params_note else None,
            "input_assets": input_assets,
            "output_groups": output_groups_data,  # 按输出组组织的图片
            "created_at": log.created_at.isoformat(),
            "is_nsfw": log.is_nsfw == 'true' if log.is_nsfw else False  # 转换为布尔值
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取记录详情失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取详情失败: {str(e)}")


@router.put("/{log_id}")
async def update_log(
    log_id: int,
    title: str = Form(...),
    log_type: str = Form(...),
    prompt: Optional[str] = Form(None),
    params_note: Optional[str] = Form(None),
    is_nsfw: Optional[str] = Form(None, description="是否为NSFW内容，'true' 或 'false'"),
    current_user: User = Depends(require_permission("log.edit")),
    db: Session = Depends(get_db)
):
    """
    更新记录（仅更新元数据，不包括图片和输出组）
    
    - **title**: 标题（必填）
    - **log_type**: 类型，'txt2img' 或 'img2img'（必填）
    - **prompt**: 提示词
    - **params_note**: 参数记录
    """
    try:
        # 验证类型
        if log_type not in ('txt2img', 'img2img'):
            raise HTTPException(status_code=400, detail="log_type 必须是 'txt2img' 或 'img2img'")
        
        # 查找记录
        log = db.query(GenLog).filter(GenLog.id == log_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="记录不存在")
        
        # 处理is_nsfw参数
        if is_nsfw is not None:
            log.is_nsfw = 'true' if is_nsfw.lower() == 'true' else 'false'
        
        # 更新记录（不再更新tools和models，因为现在在output_groups中）
        log.title = title
        log.log_type = log_type
        log.prompt = prompt if prompt and prompt.strip() else None
        log.params_note = params_note if params_note and params_note.strip() else None
        
        db.commit()
        db.refresh(log)
        
        logger.info(f"更新记录成功: ID={log_id}, title={title}")
        
        # 清除相关缓存
        cache.clear("tags:")  # 清除标签相关缓存
        cache.clear("logs_")  # 清除列表缓存
        
        return {
            "id": log.id,
            "title": log.title,
            "log_type": log.log_type,
            "prompt": log.prompt,
            "params_note": log.params_note,
            "created_at": log.created_at.isoformat(),
            "is_nsfw": log.is_nsfw == 'true' if log.is_nsfw else False  # 转换为布尔值
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新记录失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"更新记录失败: {str(e)}")


@router.delete("/{log_id}")
async def delete_log(
    log_id: int,
    current_user: User = Depends(require_permission("log.delete")),
    db: Session = Depends(get_db)
):
    """
    删除记录及其关联的所有资源（包括图片文件）
    """
    try:
        # 查找记录
        log = db.query(GenLog).filter(GenLog.id == log_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="记录不存在")
        
        # 获取所有关联的资源
        assets = db.query(LogAsset).filter(LogAsset.log_id == log_id).all()
        
        # 删除 S3 中的文件（包括原图和缩略图）
        deleted_files = []
        failed_files = []
        
        for asset in assets:
            # 删除原图
            if asset.file_key:
                success = await rustfs_client.delete_file(asset.file_key)
                if success:
                    deleted_files.append(asset.file_key)
                else:
                    failed_files.append(asset.file_key)
            
            # 尝试删除缩略图（缩略图 key 格式可能是 thumb_xxx 或从原图 key 推导）
            # 这里我们需要知道缩略图的 key，但当前设计中缩略图是单独存储的
            # 为了简化，我们只删除原图，缩略图可以后续清理
            # TODO: 如果需要精确删除缩略图，需要在 LogAsset 中添加 thumbnail_key 字段
        
        # 删除数据库记录（级联删除 LogAsset）
        db.delete(log)
        db.commit()
        
        logger.info(f"删除记录成功: ID={log_id}, 删除文件: {len(deleted_files)}, 失败: {len(failed_files)}")
        
        # 清除相关缓存
        cache.clear("tags:")  # 清除标签相关缓存
        cache.clear("logs_")  # 清除列表缓存
        
        if failed_files:
            logger.warning(f"部分文件删除失败: {failed_files}")
        
        return {
            "id": log_id,
            "message": "删除成功",
            "deleted_files": len(deleted_files),
            "failed_files": len(failed_files)
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"删除记录失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"删除记录失败: {str(e)}")


@router.post("/{log_id}/output-groups")
async def add_output_group(
    log_id: int,
    tools: Optional[str] = Form(None),
    models: Optional[str] = Form(None),
    output_files: List[UploadFile] = File(..., description="输出图片文件"),
    current_user: User = Depends(require_permission("log.edit")),
    db: Session = Depends(get_db)
):
    """
    为现有记录添加新的输出组
    
    - **tools**: 工具标签，逗号分隔的字符串
    - **models**: 模型标签，逗号分隔的字符串
    - **output_files**: 输出图片文件（必填）
    """
    try:
        # 查找记录
        log = db.query(GenLog).filter(GenLog.id == log_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="记录不存在")
        
        # 解析标签
        tools_list = [t.strip() for t in tools.split(',') if t.strip()] if tools else []
        models_list = [m.strip() for m in models.split(',') if m.strip()] if models else []
        
        # 获取当前最大的sort_order
        max_sort_order_result = db.query(OutputGroup.sort_order).filter(
            OutputGroup.log_id == log_id
        ).order_by(OutputGroup.sort_order.desc()).first()
        next_sort_order = (max_sort_order_result[0] + 1) if max_sort_order_result else 0
        
        # 创建输出组
        output_group = OutputGroup(
            log_id=log.id,
            tools=tools_list if tools_list else None,
            models=models_list if models_list else None,
            sort_order=next_sort_order
        )
        db.add(output_group)
        db.flush()  # 获取组ID
        
        # 处理输出文件
        for idx, file in enumerate(output_files):
            # 读取文件内容
            content = await file.read()
            
            # 验证图片
            is_valid, error_msg = validate_image(content, file.filename)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"输出图片验证失败 ({file.filename}): {error_msg}")
            
            # 上传原图
            original_key = await rustfs_client.upload_file(
                content,
                file.filename,
                file.content_type
            )
            if not original_key:
                raise HTTPException(status_code=500, detail=f"上传输出图片失败: {file.filename}")
            
            # 生成并上传缩略图
            try:
                thumbnail_content, thumbnail_content_type = generate_thumbnail(content)
                thumbnail_key = await rustfs_client.upload_file(
                    thumbnail_content,
                    f"thumb_{file.filename}",
                    thumbnail_content_type
                )
            except Exception as e:
                logger.warning(f"生成缩略图失败: {e}，使用原图")
                thumbnail_key = original_key
            
            # 创建资源记录，关联到输出组
            asset = LogAsset(
                log_id=log.id,
                file_key=original_key,
                asset_type='output',
                output_group_id=output_group.id,
                sort_order=idx
            )
            db.add(asset)
        
        # 提交事务
        db.commit()
        db.refresh(output_group)
        
        logger.info(f"添加输出组成功: log_id={log_id}, group_id={output_group.id}")
        
        return {
            "id": output_group.id,
            "log_id": log.id,
            "tools": output_group.tools or [],
            "models": output_group.models or [],
            "file_count": len(output_files),
            "created_at": output_group.created_at.isoformat()
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"添加输出组失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"添加输出组失败: {str(e)}")


@router.put("/{log_id}/output-groups/{group_id}")
async def update_output_group(
    log_id: int,
    group_id: int,
    tools: Optional[str] = Form(None),
    models: Optional[str] = Form(None),
    remove_asset_ids: Optional[str] = Form(None, description="要删除的图片ID列表，JSON格式：[1, 2, 3]"),
    output_files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(require_permission("log.edit")),
    db: Session = Depends(get_db)
):
    """
    更新输出组（修改工具、模型，添加或删除图片）
    
    - **tools**: 工具标签，逗号分隔的字符串
    - **models**: 模型标签，逗号分隔的字符串
    - **remove_asset_ids**: 要删除的图片ID列表，JSON格式
    - **output_files**: 新增的输出图片文件（可选）
    """
    try:
        # 查找记录和输出组
        log = db.query(GenLog).filter(GenLog.id == log_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="记录不存在")
        
        output_group = db.query(OutputGroup).filter(
            OutputGroup.id == group_id,
            OutputGroup.log_id == log_id
        ).first()
        if not output_group:
            raise HTTPException(status_code=404, detail="输出组不存在")
        
        # 更新工具和模型
        if tools is not None:
            if tools.strip() == '':
                output_group.tools = None
            else:
                tools_list = [t.strip() for t in tools.split(',') if t.strip()]
                output_group.tools = tools_list if tools_list else None
        if models is not None:
            if models.strip() == '':
                output_group.models = None
            else:
                models_list = [m.strip() for m in models.split(',') if m.strip()]
                output_group.models = models_list if models_list else None
        
        # 删除指定的图片
        if remove_asset_ids:
            import json
            try:
                asset_ids_to_remove = json.loads(remove_asset_ids)
                if isinstance(asset_ids_to_remove, list):
                    assets_to_remove = db.query(LogAsset).filter(
                        LogAsset.id.in_(asset_ids_to_remove),
                        LogAsset.output_group_id == group_id,
                        LogAsset.log_id == log_id
                    ).all()
                    
                    for asset in assets_to_remove:
                        # 删除S3中的文件
                        try:
                            await rustfs_client.delete_file(asset.file_key)
                        except Exception as e:
                            logger.warning(f"删除文件失败: {asset.file_key}, {e}")
                        
                        db.delete(asset)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="remove_asset_ids 必须是有效的JSON数组")
        
        # 添加新的图片
        current_max_sort = db.query(LogAsset.sort_order).filter(
            LogAsset.output_group_id == group_id
        ).order_by(LogAsset.sort_order.desc()).first()
        next_sort_order = (current_max_sort[0] + 1) if current_max_sort else 0
        
        for idx, file in enumerate(output_files):
            content = await file.read()
            
            is_valid, error_msg = validate_image(content, file.filename)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"输出图片验证失败 ({file.filename}): {error_msg}")
            
            original_key = await rustfs_client.upload_file(
                content,
                file.filename,
                file.content_type
            )
            if not original_key:
                raise HTTPException(status_code=500, detail=f"上传输出图片失败: {file.filename}")
            
            try:
                thumbnail_content = generate_thumbnail(content)
                thumbnail_key = await rustfs_client.upload_file(
                    thumbnail_content,
                    f"thumb_{file.filename}",
                    "image/jpeg"
                )
            except Exception as e:
                logger.warning(f"生成缩略图失败: {e}，使用原图")
                thumbnail_key = original_key
            
            asset = LogAsset(
                log_id=log.id,
                file_key=original_key,
                asset_type='output',
                output_group_id=output_group.id,
                sort_order=next_sort_order + idx
            )
            db.add(asset)
        
        db.commit()
        db.refresh(output_group)
        
        logger.info(f"更新输出组成功: log_id={log_id}, group_id={group_id}")
        
        # 清除相关缓存
        cache.clear("tags:")  # 清除标签相关缓存
        cache.clear("logs_")  # 清除列表缓存
        
        return {
            "id": output_group.id,
            "log_id": log.id,
            "tools": output_group.tools or [],
            "models": output_group.models or [],
            "created_at": output_group.created_at.isoformat()
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新输出组失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"更新输出组失败: {str(e)}")


@router.delete("/{log_id}/output-groups/{group_id}")
async def delete_output_group(
    log_id: int,
    group_id: int,
    current_user: User = Depends(require_permission("log.delete")),
    db: Session = Depends(get_db)
):
    """
    删除输出组及其关联的所有图片
    """
    try:
        # 查找记录和输出组
        log = db.query(GenLog).filter(GenLog.id == log_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="记录不存在")
        
        output_group = db.query(OutputGroup).filter(
            OutputGroup.id == group_id,
            OutputGroup.log_id == log_id
        ).first()
        if not output_group:
            raise HTTPException(status_code=404, detail="输出组不存在")
        
        # 获取该组的所有图片
        assets = db.query(LogAsset).filter(
            LogAsset.output_group_id == group_id,
            LogAsset.log_id == log_id
        ).all()
        
        # 删除S3中的文件
        for asset in assets:
            try:
                await rustfs_client.delete_file(asset.file_key)
            except Exception as e:
                logger.warning(f"删除文件失败: {asset.file_key}, {e}")
        
        # 删除输出组（级联删除会同时删除关联的assets）
        db.delete(output_group)
        db.commit()
        
        logger.info(f"删除输出组成功: log_id={log_id}, group_id={group_id}")
        
        # 清除相关缓存
        cache.clear("tags:")  # 清除标签相关缓存
        cache.clear("logs_")  # 清除列表缓存
        
        return {"message": "输出组已删除"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"删除输出组失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"删除输出组失败: {str(e)}")

