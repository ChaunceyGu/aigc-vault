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

router = APIRouter()


@router.get("/tools")
async def get_tools(db: Session = Depends(get_db)) -> List[str]:
    """
    获取所有工具标签
    """
    # 从所有记录中提取 tools 数组的所有唯一值
    # PostgreSQL 使用 unnest 函数展开数组
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT DISTINCT unnest(tools) as tool 
        FROM gen_logs 
        WHERE tools IS NOT NULL AND array_length(tools, 1) > 0
    """)).fetchall()
    # 过滤掉空字符串和 None
    tools = sorted([row[0] for row in result if row[0] and row[0].strip()])
    return tools


@router.get("/models")
async def get_models(db: Session = Depends(get_db)) -> List[str]:
    """
    获取所有模型标签
    """
    # 从所有记录中提取 models 数组的所有唯一值
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT DISTINCT unnest(models) as model 
        FROM gen_logs 
        WHERE models IS NOT NULL AND array_length(models, 1) > 0
    """)).fetchall()
    # 过滤掉空字符串和 None
    models = sorted([row[0] for row in result if row[0] and row[0].strip()])
    return models


@router.get("/stats")
async def get_tag_stats(db: Session = Depends(get_db)) -> Dict:
    """
    获取标签统计信息（用于筛选器）
    """
    from sqlalchemy import text
    
    # 工具统计
    tools_result = db.execute(text("""
        SELECT unnest(tools) as tool, COUNT(*) as count
        FROM gen_logs
        WHERE tools IS NOT NULL AND array_length(tools, 1) > 0
        GROUP BY tool
    """)).fetchall()
    
    # 过滤掉空字符串和 None
    tools_stats = {row[0]: row[1] for row in tools_result if row[0] and row[0].strip()}
    
    # 模型统计
    models_result = db.execute(text("""
        SELECT unnest(models) as model, COUNT(*) as count
        FROM gen_logs
        WHERE models IS NOT NULL AND array_length(models, 1) > 0
        GROUP BY model
    """)).fetchall()
    
    # 过滤掉空字符串和 None
    models_stats = {row[0]: row[1] for row in models_result if row[0] and row[0].strip()}
    
    return {
        "tools": tools_stats,
        "models": models_stats
    }

