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
from app.services.rustfs_client import rustfs_client
from app.utils.image_processor import generate_thumbnail, validate_image
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/")
async def create_log(
    request: Request,
    title: str = Form(...),
    log_type: str = Form(...),
    tools: Optional[str] = Form(None),
    models: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None),
    params_note: Optional[str] = Form(None),
    input_files: List[UploadFile] = File(default=[]),  # 改为必填但默认空列表
    input_notes: Optional[str] = Form(None, description="输入图片备注，JSON 格式：{'filename1': 'note1', ...}"),
    output_files: List[UploadFile] = File(..., description="输出图片文件"),
    db: Session = Depends(get_db)
):
    """
    创建新的生成记录
    
    - **title**: 标题（必填）
    - **log_type**: 类型，'txt2img' 或 'img2img'（必填）
    - **tools**: 工具标签，逗号分隔的字符串
    - **models**: 模型标签，逗号分隔的字符串
    - **prompt**: 提示词
    - **params_note**: 参数记录
    - **input_files**: 输入图片（仅 img2img 模式需要）
    - **input_notes**: 输入图片备注，JSON 字符串
    - **output_files**: 输出图片（必填）
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
        
        # 解析标签（从逗号分隔的字符串转为列表）
        # 过滤掉空字符串，避免保存空标签
        tools_list = [t.strip() for t in tools.split(',') if t.strip()] if tools else []
        models_list = [m.strip() for m in models.split(',') if m.strip()] if models else []
        
        logger.info(f"🏷️  解析标签 - tools: {tools_list}, models: {models_list}")
        
        # 解析输入备注（JSON 格式）
        input_notes_dict = {}
        if input_notes:
            import json
            try:
                input_notes_dict = json.loads(input_notes)
            except json.JSONDecodeError:
                logger.warning(f"无法解析 input_notes JSON: {input_notes}")
        
        # 创建日志记录
        log = GenLog(
            title=title,
            log_type=log_type,
            tools=tools_list if tools_list else None,
            models=models_list if models_list else None,
            prompt=prompt,
            params_note=params_note
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
                    thumbnail_content = generate_thumbnail(content)
                    thumbnail_key = await rustfs_client.upload_file(
                        thumbnail_content,
                        f"thumb_{file.filename}",
                        "image/jpeg"
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
                thumbnail_content = generate_thumbnail(content)
                thumbnail_key = await rustfs_client.upload_file(
                    thumbnail_content,
                    f"thumb_{file.filename}",
                    "image/jpeg"
                )
            except Exception as e:
                logger.warning(f"生成缩略图失败: {e}，使用原图")
                thumbnail_key = original_key
            
            # 创建资源记录（存储原图的 key，缩略图单独管理）
            asset = LogAsset(
                log_id=log.id,
                file_key=original_key,
                asset_type='output',
                sort_order=idx
            )
            db.add(asset)
        
        # 提交事务
        db.commit()
        db.refresh(log)
        
        logger.info(f"创建记录成功: ID={log.id}, title={title}")
        
        return {
            "id": log.id,
            "title": log.title,
            "log_type": log.log_type,
            "created_at": log.created_at.isoformat()
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
        query = db.query(GenLog)
        
        # 标题搜索
        if search:
            query = query.filter(GenLog.title.ilike(f"%{search}%"))
        
        # 类型筛选
        if log_type:
            query = query.filter(GenLog.log_type == log_type)
        
        # 标签筛选（数组包含查询）
        if tool:
            # 使用 PostgreSQL 的 ANY 操作符，但需要转义单引号防止 SQL 注入
            # 由于 tool 是用户输入，我们只允许字母数字和常见字符
            if all(c.isalnum() or c in ' ._-' for c in tool):
                from sqlalchemy import text
                # 转义单引号
                tool_escaped = tool.replace("'", "''")
                query = query.filter(text(f"'{tool_escaped}' = ANY(tools)"))
            else:
                # 如果包含特殊字符，返回空结果
                query = query.filter(text("1=0"))
        
        if model:
            # 同样处理模型标签
            if all(c.isalnum() or c in ' ._-' for c in model):
                from sqlalchemy import text
                model_escaped = model.replace("'", "''")
                query = query.filter(text(f"'{model_escaped}' = ANY(models)"))
            else:
                query = query.filter(text("1=0"))
        
        # 排序：最新的在前
        query = query.order_by(desc(GenLog.created_at))
        
        # 分页
        total = query.count()
        logs = query.offset((page - 1) * page_size).limit(page_size).all()
        
        # 获取封面图和输出图片信息
        result = []
        for log in logs:
            # 查找所有 output 图片
            output_assets = db.query(LogAsset).filter(
                LogAsset.log_id == log.id,
                LogAsset.asset_type == 'output'
            ).order_by(LogAsset.sort_order).all()
            
            # 生成封面图 URL（第一张图片）和多张图片的预览 URL
            cover_url = None
            preview_urls: list[str] = []
            
            # 获取前几张图片的 URL（最多4张，用于预览）
            for asset in output_assets[:4]:
                try:
                    url = await rustfs_client.get_file_url(asset.file_key, expires_in=3600)
                    preview_urls.append(url)
                    if not cover_url:  # 第一张作为封面
                        cover_url = url
                except Exception as e:
                    logger.warning(f"生成预签名 URL 失败，使用公开 URL: {e}")
                    url = rustfs_client.get_public_url(asset.file_key)
                    preview_urls.append(url)
                    if not cover_url:
                        cover_url = url
            
            result.append({
                "id": log.id,
                "title": log.title,
                "log_type": log.log_type,
                "tools": log.tools or [],
                "models": log.models or [],
                "cover_url": cover_url,
                "output_count": len(output_assets),  # 输出图片总数
                "preview_urls": preview_urls,  # 前几张预览图（最多4张）
                "created_at": log.created_at.isoformat()
            })
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": result
        }
        
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
        
        # 分离输入和输出资源
        input_assets = []
        output_assets = []
        
        for asset in assets:
            # 使用预签名 URL（有效期1小时）
            try:
                asset_url = await rustfs_client.get_file_url(asset.file_key, expires_in=3600)
            except Exception as e:
                logger.warning(f"生成预签名 URL 失败，使用公开 URL: {e}")
                # 公开 URL 是同步方法，不需要 await
                asset_url = rustfs_client.get_public_url(asset.file_key)
            
            asset_data = {
                "id": asset.id,
                "file_key": asset.file_key,
                "url": asset_url,
                "note": asset.note,
                "sort_order": asset.sort_order
            }
            
            if asset.asset_type == 'input':
                input_assets.append(asset_data)
            else:
                output_assets.append(asset_data)
        
        logger.info(f"返回详情 - input_assets数量: {len(input_assets)}, output_assets数量: {len(output_assets)}")
        
        return {
            "id": log.id,
            "title": log.title,
            "log_type": log.log_type,
            "tools": log.tools or [],
            "models": log.models or [],
            "prompt": log.prompt if log.prompt else None,
            "params_note": log.params_note if log.params_note else None,
            "input_assets": input_assets,
            "output_assets": output_assets,
            "created_at": log.created_at.isoformat()
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
    tools: Optional[str] = Form(None),
    models: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None),
    params_note: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    更新记录（仅更新元数据，不包括图片）
    
    - **title**: 标题（必填）
    - **log_type**: 类型，'txt2img' 或 'img2img'（必填）
    - **tools**: 工具标签，逗号分隔的字符串
    - **models**: 模型标签，逗号分隔的字符串
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
        
        # 解析标签（从逗号分隔的字符串转为列表）
        # 过滤掉空字符串，避免保存空标签
        tools_list = [t.strip() for t in tools.split(',') if t.strip()] if tools else []
        models_list = [m.strip() for m in models.split(',') if m.strip()] if models else []
        
        # 更新记录
        log.title = title
        log.log_type = log_type
        log.tools = tools_list if tools_list else None
        log.models = models_list if models_list else None
        log.prompt = prompt if prompt and prompt.strip() else None
        log.params_note = params_note if params_note and params_note.strip() else None
        
        db.commit()
        db.refresh(log)
        
        logger.info(f"更新记录成功: ID={log_id}, title={title}")
        
        return {
            "id": log.id,
            "title": log.title,
            "log_type": log.log_type,
            "tools": log.tools or [],
            "models": log.models or [],
            "prompt": log.prompt,
            "params_note": log.params_note,
            "created_at": log.created_at.isoformat()
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新记录失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"更新记录失败: {str(e)}")


@router.delete("/{log_id}")
async def delete_log(log_id: int, db: Session = Depends(get_db)):
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

