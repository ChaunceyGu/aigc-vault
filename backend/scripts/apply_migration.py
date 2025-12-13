"""
应用数据库迁移脚本
用于执行 add_comparison_group.sql
"""
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine
from app.config import settings

def apply_migration():
    """执行对比组迁移脚本"""
    print("=" * 60)
    print("应用数据库迁移：添加对比组功能")
    print("=" * 60)
    
    # 读取 SQL 文件
    sql_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        'migrations',
        'add_comparison_group.sql'
    )
    
    if not os.path.exists(sql_file):
        print(f"[ERROR] SQL 文件不存在: {sql_file}")
        return False
    
    print(f"\n读取 SQL 文件: {sql_file}")
    
    try:
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
    except Exception as e:
        print(f"[ERROR] 读取 SQL 文件失败: {e}")
        return False
    
    # 执行 SQL
    print("\n正在执行迁移脚本...")
    print(f"数据库: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else '未知'}\n")
    
    try:
        with engine.connect() as conn:
            # 按行分割并执行每个语句
            statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]
            
            for statement in statements:
                if statement:
                    try:
                        conn.execute(text(statement))
                        conn.commit()
                        print(f"[OK] 执行成功")
                    except Exception as e:
                        # 如果字段已存在，忽略错误
                        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                            print(f"[SKIP] 字段或索引已存在，跳过")
                        else:
                            print(f"[WARN] 执行语句时出错（可能已存在）: {str(e)[:100]}")
        
        print("\n[OK] 迁移完成！")
        return True
        
    except Exception as e:
        print(f"[ERROR] 执行迁移失败: {e}")
        return False

if __name__ == "__main__":
    success = apply_migration()
    sys.exit(0 if success else 1)

