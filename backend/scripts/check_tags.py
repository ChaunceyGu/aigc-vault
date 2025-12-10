"""
检查标签数据脚本
"""
import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

try:
    from app.database import get_db
    from app.models.gen_log import GenLog
except ImportError as e:
    print("❌ 导入失败，请确保已激活虚拟环境")
    print(f"  错误: {e}")
    sys.exit(1)

def check_tags():
    """检查所有记录的标签"""
    db = next(get_db())
    try:
        logs = db.query(GenLog).order_by(GenLog.created_at.desc()).all()
        
        print(f"\n📋 检查 {len(logs)} 条记录的标签:")
        print("=" * 80)
        
        all_models = set()
        all_tools = set()
        
        for log in logs:
            if log.models:
                all_models.update(log.models)
            if log.tools:
                all_tools.update(log.tools)
            
            print(f"ID: {log.id:4d} | 标题: {log.title[:20]:20s} | 模型: {log.models or []} | 工具: {log.tools or []}")
        
        print("=" * 80)
        print(f"\n📊 统计:")
        print(f"  所有模型标签 ({len(all_models)}): {sorted(all_models)}")
        print(f"  所有工具标签 ({len(all_tools)}): {sorted(all_tools)}")
        
        # 检查是否有空字符串标签
        empty_models = [m for m in all_models if not m or not m.strip()]
        empty_tools = [t for t in all_tools if not t or not t.strip()]
        
        if empty_models:
            print(f"\n⚠️  发现空模型标签: {empty_models}")
        if empty_tools:
            print(f"\n⚠️  发现空工具标签: {empty_tools}")
        
    except Exception as e:
        print(f"❌ 查询失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_tags()

