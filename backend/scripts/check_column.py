"""
检查 comparison_group_id 字段是否存在
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from app.database import engine
from app.config import settings

def check_column():
    """检查 comparison_group_id 字段"""
    print("=" * 60)
    print("检查 comparison_group_id 字段")
    print("=" * 60)
    
    try:
        with engine.connect() as conn:
            # 检查字段是否存在
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'gen_logs' 
                AND column_name = 'comparison_group_id'
            """))
            row = result.fetchone()
            
            if row:
                print("\n[OK] comparison_group_id 字段已存在")
                
                # 检查字段类型
                result = conn.execute(text("""
                    SELECT data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'gen_logs' 
                    AND column_name = 'comparison_group_id'
                """))
                col_info = result.fetchone()
                if col_info:
                    print(f"   类型: {col_info[0]}")
                    print(f"   可空: {col_info[1]}")
                
                return True
            else:
                print("\n[ERROR] comparison_group_id 字段不存在")
                print("\n开始添加字段...")
                
                # 添加字段
                conn.execute(text("""
                    ALTER TABLE gen_logs 
                    ADD COLUMN comparison_group_id INTEGER
                """))
                conn.commit()
                print("[OK] 字段添加成功")
                
                # 添加索引
                try:
                    conn.execute(text("""
                        CREATE INDEX idx_logs_comparison_group_id 
                        ON gen_logs (comparison_group_id) 
                        WHERE comparison_group_id IS NOT NULL
                    """))
                    conn.commit()
                    print("[OK] 索引创建成功")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        print("[SKIP] 索引已存在")
                    else:
                        print(f"[WARN] 索引创建失败: {e}")
                
                return True
                
    except Exception as e:
        print(f"\n[ERROR] 检查失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_column()
    sys.exit(0 if success else 1)

