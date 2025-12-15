"""
标签相关 API
获取所有标签和统计信息
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List, Dict

from app.database import get_db
from app.models.gen_log import GenLog
from app.utils.cache import cache

router = APIRouter()


@router.get("/tools")
async def get_tools(db: Session = Depends(get_db)) -> List[str]:
    """
    获取所有工具标签
    同时查询主表和输出组表的数据
    使用缓存优化性能（缓存5分钟）
    """
    cache_key = "tags:tools"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    
    # 从所有记录中提取 tools 数组的所有唯一值
    # PostgreSQL 使用 unnest 函数展开数组
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT DISTINCT tool
        FROM (
            -- 从主表查询（兼容旧数据）
            SELECT unnest(tools) as tool 
            FROM gen_logs 
            WHERE tools IS NOT NULL AND array_length(tools, 1) > 0
            
            UNION
            
            -- 从输出组表查询（新数据）
            SELECT unnest(tools) as tool
            FROM log_output_groups
            WHERE tools IS NOT NULL AND array_length(tools, 1) > 0
        ) AS all_tools
        WHERE tool IS NOT NULL AND tool != ''
    """)).fetchall()
    # 过滤掉空字符串和 None
    tools = sorted([row[0] for row in result if row[0] and row[0].strip()])
    
    # 缓存结果（5分钟）
    cache.set(cache_key, tools, 300)
    return tools


@router.get("/models")
async def get_models(db: Session = Depends(get_db)) -> List[str]:
    """
    获取所有模型标签
    同时查询主表和输出组表的数据
    使用缓存优化性能（缓存5分钟）
    """
    cache_key = "tags:models"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    
    # 从所有记录中提取 models 数组的所有唯一值
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT DISTINCT model
        FROM (
            -- 从主表查询（兼容旧数据）
            SELECT unnest(models) as model 
            FROM gen_logs 
            WHERE models IS NOT NULL AND array_length(models, 1) > 0
            
            UNION
            
            -- 从输出组表查询（新数据）
            SELECT unnest(models) as model
            FROM log_output_groups
            WHERE models IS NOT NULL AND array_length(models, 1) > 0
        ) AS all_models
        WHERE model IS NOT NULL AND model != ''
    """)).fetchall()
    # 过滤掉空字符串和 None
    models = sorted([row[0] for row in result if row[0] and row[0].strip()])
    
    # 缓存结果（5分钟）
    cache.set(cache_key, models, 300)
    return models


@router.get("/stats")
async def get_tag_stats(db: Session = Depends(get_db)) -> Dict:
    """
    获取标签统计信息（用于筛选器）
    同时查询主表和输出组表的数据
    使用缓存优化性能（缓存5分钟）
    """
    cache_key = "tags:stats"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    
    from sqlalchemy import text
    
    # 工具统计：从主表和输出组表合并查询
    tools_result = db.execute(text("""
        SELECT tool, COUNT(DISTINCT log_id) as count
        FROM (
            -- 从主表查询（兼容旧数据）
            SELECT unnest(tools) as tool, id as log_id
            FROM gen_logs
            WHERE tools IS NOT NULL AND array_length(tools, 1) > 0
            
            UNION ALL
            
            -- 从输出组表查询（新数据）
            SELECT unnest(tools) as tool, log_id
            FROM log_output_groups
            WHERE tools IS NOT NULL AND array_length(tools, 1) > 0
        ) AS all_tools
        WHERE tool IS NOT NULL AND tool != ''
        GROUP BY tool
    """)).fetchall()
    
    # 过滤掉空字符串和 None
    tools_stats = {row[0]: row[1] for row in tools_result if row[0] and row[0].strip()}
    
    # 模型统计：从主表和输出组表合并查询
    models_result = db.execute(text("""
        SELECT model, COUNT(DISTINCT log_id) as count
        FROM (
            -- 从主表查询（兼容旧数据）
            SELECT unnest(models) as model, id as log_id
            FROM gen_logs
            WHERE models IS NOT NULL AND array_length(models, 1) > 0
            
            UNION ALL
            
            -- 从输出组表查询（新数据）
            SELECT unnest(models) as model, log_id
            FROM log_output_groups
            WHERE models IS NOT NULL AND array_length(models, 1) > 0
        ) AS all_models
        WHERE model IS NOT NULL AND model != ''
        GROUP BY model
    """)).fetchall()
    
    # 过滤掉空字符串和 None
    models_stats = {row[0]: row[1] for row in models_result if row[0] and row[0].strip()}
    
    result = {
        "tools": tools_stats,
        "models": models_stats
    }
    
    # 缓存结果（5分钟）
    cache.set(cache_key, result, 300)
    return result

