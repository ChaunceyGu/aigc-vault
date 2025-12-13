"""
应用输出组数据库迁移脚本
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine
from app.config import settings

def apply_migration():
    """执行输出组迁移脚本"""
    print("=" * 60)
    print("应用数据库迁移：添加输出组功能")
    print("=" * 60)
    
    sql_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        'migrations',
        'add_output_groups.sql'
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
    
    print("\n正在执行迁移脚本...")
    print(f"数据库: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else '未知'}\n")
    
    try:
        # 智能分割SQL语句，处理DO块
        statements = []
        current_statement = ""
        in_do_block = False
        
        for line in sql_content.split('\n'):
            stripped = line.strip()
            if not stripped or stripped.startswith('--'):
                continue
            
            current_statement += line + '\n'
            
            # 检查是否进入DO块
            if 'DO $$' in stripped.upper() or 'DO $' in stripped.upper():
                in_do_block = True
            
            # 检查是否结束DO块
            if in_do_block and 'END $$' in stripped.upper() or 'END $' in stripped.upper():
                in_do_block = False
                if current_statement.strip():
                    statements.append(current_statement.strip())
                    current_statement = ""
            elif not in_do_block and stripped.endswith(';'):
                if current_statement.strip():
                    statements.append(current_statement.strip())
                    current_statement = ""
        
        # 添加最后一个语句（如果有）
        if current_statement.strip():
            statements.append(current_statement.strip())
        
        with engine.begin() as conn:
            for statement in statements:
                if statement:
                    try:
                        conn.execute(text(statement))
                        print(f"[OK] 执行成功")
                    except Exception as e:
                        error_str = str(e).lower()
                        if "already exists" in error_str or "duplicate" in error_str:
                            print(f"[SKIP] 表或字段已存在，跳过")
                        elif "does not exist" in error_str:
                            # 如果表不存在，需要先创建表，然后继续
                            print(f"[WARN] 表不存在，可能需要先执行前面的语句: {str(e)[:100]}")
                            # 回滚当前事务，重新开始
                            conn.rollback()
                            # 重新执行这个语句
                            try:
                                conn.execute(text(statement))
                                print(f"[OK] 重新执行成功")
                            except Exception as e2:
                                print(f"[ERROR] 重新执行失败: {str(e2)[:100]}")
                                return False
                        else:
                            print(f"[WARN] 执行语句时出错: {str(e)[:100]}")
                            # 对于非致命错误，继续执行
                            continue
        
        print("\n[OK] 迁移完成！")
        return True
        
    except Exception as e:
        print(f"[ERROR] 执行迁移失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = apply_migration()
    sys.exit(0 if success else 1)

