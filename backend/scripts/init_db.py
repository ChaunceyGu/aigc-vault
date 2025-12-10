"""
数据库初始化脚本
自动执行 migrations/init.sql 创建表结构
"""
import sys
import os
import re

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine
from app.config import settings

def split_sql_statements(sql_content):
    """
    智能分割 SQL 语句，处理多行语句
    """
    # 移除注释行（以 -- 开头的行）
    lines = []
    for line in sql_content.split('\n'):
        stripped = line.strip()
        if stripped and not stripped.startswith('--'):
            lines.append(line)
        elif not stripped:
            lines.append('')  # 保留空行用于分割
    
    sql_content = '\n'.join(lines)
    
    # 按分号分割，但需要考虑字符串中的分号
    statements = []
    current_stmt = []
    in_string = False
    string_char = None
    
    for line in sql_content.split('\n'):
        current_line = ''
        i = 0
        while i < len(line):
            char = line[i]
            
            # 处理字符串
            if char in ("'", '"') and (i == 0 or line[i-1] != '\\'):
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                    string_char = None
            
            # 如果遇到分号且不在字符串中，分割语句
            if char == ';' and not in_string:
                current_line += char
                current_stmt.append(current_line)
                stmt = '\n'.join(current_stmt).strip()
                if stmt:
                    statements.append(stmt)
                current_stmt = []
                current_line = ''
            else:
                current_line += char
            i += 1
        
        if current_line.strip():
            current_stmt.append(current_line)
    
    # 处理最后一个语句（可能没有分号）
    if current_stmt:
        stmt = '\n'.join(current_stmt).strip()
        if stmt:
            statements.append(stmt)
    
    return statements

def extract_table_name(statement):
    """从 CREATE TABLE 语句中提取表名"""
    match = re.search(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)', statement, re.IGNORECASE)
    return match.group(1).lower() if match else None

def init_database():
    """执行数据库初始化脚本"""
    print("=" * 60)
    print("数据库初始化")
    print("=" * 60)
    
    # 读取 SQL 文件
    sql_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        'migrations',
        'init.sql'
    )
    
    if not os.path.exists(sql_file):
        print(f"❌ SQL 文件不存在: {sql_file}")
        return False
    
    print(f"\n读取 SQL 文件: {sql_file}")
    
    try:
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
    except Exception as e:
        print(f"❌ 读取 SQL 文件失败: {e}")
        return False
    
    # 执行 SQL
    print("\n正在执行 SQL 脚本...")
    print(f"数据库: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else '未知'}")
    
    # 分割 SQL 语句
    statements = split_sql_statements(sql_content)
    print(f"共找到 {len(statements)} 条 SQL 语句\n")
    
    success_count = 0
    error_count = 0
    
    # 每个语句独立执行，使用自动提交模式
    for i, statement in enumerate(statements, 1):
        if not statement.strip():
            continue
        
        try:
            # 使用 begin() 确保每个语句独立事务
            with engine.begin() as conn:
                conn.execute(text(statement))
            
            # 显示关键操作
            stmt_upper = statement.upper()
            if 'CREATE TABLE' in stmt_upper:
                table_name = extract_table_name(statement)
                if table_name:
                    print(f"✅ [{i}] 创建表: {table_name}")
                    success_count += 1
            elif 'CREATE INDEX' in stmt_upper:
                # 提取索引名和表名
                idx_match = re.search(r'CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s+ON\s+([a-zA-Z_][a-zA-Z0-9_]*)', statement, re.IGNORECASE)
                if idx_match:
                    idx_name = idx_match.group(1)
                    table_name = idx_match.group(2)
                    print(f"✅ [{i}] 创建索引: {idx_name} ON {table_name}")
                    success_count += 1
            elif 'ALTER TABLE' in stmt_upper:
                table_match = re.search(r'ALTER\s+TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)', statement, re.IGNORECASE)
                if table_match:
                    table_name = table_match.group(1)
                    print(f"✅ [{i}] 添加约束: {table_name}")
                    success_count += 1
            elif 'COMMENT' in stmt_upper:
                success_count += 1
                # 注释不显示，减少输出
            else:
                success_count += 1
                
        except Exception as e:
            error_str = str(e)
            # 检查是否是"已存在"错误
            if any(keyword in error_str.lower() for keyword in ['already exists', 'duplicate', '已存在', '重复']):
                print(f"ℹ️  [{i}] 对象已存在，跳过")
                success_count += 1
            else:
                error_count += 1
                print(f"❌ [{i}] 执行失败: {error_str[:100]}")
                # 显示语句的前50个字符以便定位
                stmt_preview = statement.replace('\n', ' ').strip()[:80]
                print(f"   语句预览: {stmt_preview}...")
    
    print("\n" + "=" * 60)
    if error_count == 0:
        print(f"✅ 数据库初始化完成！(成功: {success_count}, 失败: {error_count})")
    else:
        print(f"⚠️  数据库初始化部分完成 (成功: {success_count}, 失败: {error_count})")
    print("=" * 60)
    print("\n建议运行 verify_db.py 验证表结构是否正确")
    
    return error_count == 0

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)

