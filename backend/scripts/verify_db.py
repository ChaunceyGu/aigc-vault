"""
数据库连接验证脚本
用于测试数据库连接和表结构是否正确
"""
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from app.database import engine, SessionLocal
from app.config import settings

def verify_database():
    """验证数据库连接和表结构"""
    print("=" * 60)
    print("数据库连接验证")
    print("=" * 60)
    
    # 1. 测试连接
    print("\n[1] 测试数据库连接...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"✅ 连接成功！")
            print(f"   数据库版本: {version.split(',')[0]}")
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        print(f"\n请检查 .env 文件中的 DATABASE_URL 配置")
        print(f"当前配置: {settings.DATABASE_URL}")
        return False
    
    # 2. 检查数据库名称
    print("\n[2] 检查数据库信息...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT current_database();"))
            db_name = result.fetchone()[0]
            print(f"✅ 当前数据库: {db_name}")
    except Exception as e:
        print(f"❌ 获取数据库信息失败: {e}")
        return False
    
    # 3. 检查表是否存在
    print("\n[3] 检查表结构...")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    required_tables = ['gen_logs', 'log_assets']
    missing_tables = []
    
    for table in required_tables:
        if table in tables:
            print(f"✅ 表 '{table}' 存在")
            
            # 显示表结构
            columns = inspector.get_columns(table)
            print(f"   字段数: {len(columns)}")
            for col in columns[:3]:  # 只显示前3个字段
                print(f"   - {col['name']}: {col['type']}")
            if len(columns) > 3:
                print(f"   ... 还有 {len(columns) - 3} 个字段")
        else:
            print(f"❌ 表 '{table}' 不存在")
            missing_tables.append(table)
    
    if missing_tables:
        print(f"\n⚠️  缺少以下表: {', '.join(missing_tables)}")
        print("请执行 migrations/init.sql 创建表结构")
        return False
    
    # 4. 检查索引
    print("\n[4] 检查索引...")
    try:
        with engine.connect() as conn:
            # 检查 GIN 索引
            result = conn.execute(text("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'gen_logs' 
                AND indexname LIKE '%tools%' OR indexname LIKE '%models%'
            """))
            indexes = [row[0] for row in result.fetchall()]
            if indexes:
                print(f"✅ 找到 GIN 索引: {', '.join(indexes)}")
            else:
                print("⚠️  未找到 GIN 索引（可能影响查询性能）")
    except Exception as e:
        print(f"⚠️  检查索引时出错: {e}")
    
    # 5. 测试数组功能
    print("\n[5] 测试 PostgreSQL 数组功能...")
    try:
        with SessionLocal() as db:
            result = db.execute(text("""
                SELECT ARRAY['test1', 'test2'] AS test_array;
            """))
            test_result = result.fetchone()[0]
            print(f"✅ 数组功能正常: {test_result}")
    except Exception as e:
        print(f"❌ 数组功能测试失败: {e}")
        print("⚠️  请确保 PostgreSQL 版本 >= 9.1")
        return False
    
    # 6. 测试写入（可选）
    print("\n[6] 测试写入权限...")
    try:
        with SessionLocal() as db:
            # 尝试插入一条测试数据
            result = db.execute(text("""
                INSERT INTO gen_logs (title, log_type) 
                VALUES ('测试记录', 'txt2img')
                RETURNING id;
            """))
            test_id = result.fetchone()[0]
            
            # 删除测试数据
            db.execute(text("DELETE FROM gen_logs WHERE id = :id"), {"id": test_id})
            db.commit()
            print(f"✅ 写入权限正常（已创建并删除测试记录 ID: {test_id}）")
    except Exception as e:
        print(f"⚠️  写入测试失败: {e}")
        print("   可能是权限问题，请检查数据库用户权限")
    
    print("\n" + "=" * 60)
    print("✅ 数据库验证完成！")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = verify_database()
    sys.exit(0 if success else 1)

