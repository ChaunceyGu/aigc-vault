"""
测试上传功能脚本
用于测试输入文件是否正确上传
"""
import sys
import os

# 添加项目根目录到路径
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

try:
    from sqlalchemy.orm import Session
    from app.database import get_db
    from app.models.log_asset import LogAsset
    from app.models.gen_log import GenLog
except ImportError as e:
    print("❌ 导入失败，请确保：")
    print("  1. 已激活虚拟环境（在 backend 目录下运行: venv\\Scripts\\activate）")
    print("  2. 已安装依赖（运行: pip install -r requirements.txt）")
    print(f"  3. 具体错误: {e}")
    sys.exit(1)

def check_log_assets(log_id: int):
    """检查指定记录的资产"""
    db: Session = next(get_db())
    try:
        log = db.query(GenLog).filter(GenLog.id == log_id).first()
        if not log:
            print(f"❌ 记录 {log_id} 不存在")
            return
        
        print(f"\n📋 记录信息:")
        print(f"  ID: {log.id}")
        print(f"  标题: {log.title}")
        print(f"  类型: {log.log_type}")
        print(f"  创建时间: {log.created_at}")
        
        # 查询所有资产
        assets = db.query(LogAsset).filter(
            LogAsset.log_id == log_id
        ).order_by(LogAsset.sort_order).all()
        
        print(f"\n📦 资产总数: {len(assets)}")
        
        input_assets = [a for a in assets if a.asset_type == 'input']
        output_assets = [a for a in assets if a.asset_type == 'output']
        
        print(f"\n📥 输入图片 (input): {len(input_assets)} 张")
        for idx, asset in enumerate(input_assets, 1):
            print(f"  {idx}. ID={asset.id}, file_key={asset.file_key}, note={asset.note or '(无备注)'}")
        
        print(f"\n📤 输出图片 (output): {len(output_assets)} 张")
        for idx, asset in enumerate(output_assets, 1):
            print(f"  {idx}. ID={asset.id}, file_key={asset.file_key}")
        
        if log.log_type == 'img2img' and len(input_assets) == 0:
            print(f"\n⚠️  警告: 这是图生图记录，但没有输入图片！")
        
    except Exception as e:
        print(f"❌ 查询失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def list_recent_logs(limit=10):
    """列出最近的记录"""
    db: Session = next(get_db())
    try:
        logs = db.query(GenLog).order_by(GenLog.created_at.desc()).limit(limit).all()
        print(f"\n📋 最近的 {len(logs)} 条记录:")
        print("-" * 80)
        for log in logs:
            assets = db.query(LogAsset).filter(LogAsset.log_id == log.id).all()
            input_count = len([a for a in assets if a.asset_type == 'input'])
            output_count = len([a for a in assets if a.asset_type == 'output'])
            print(f"ID: {log.id:6d} | 类型: {log.log_type:8s} | 标题: {log.title[:30]:30s} | 输入: {input_count:2d} | 输出: {output_count:2d}")
        print("-" * 80)
    except Exception as e:
        print(f"❌ 查询失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # 检查指定记录
        try:
            log_id = int(sys.argv[1])
            check_log_assets(log_id)
        except ValueError:
            print("❌ 请提供有效的记录 ID（数字）")
    else:
        # 列出最近的记录
        list_recent_logs()
        print("\n💡 使用方法:")
        print("  python scripts/test_upload.py          # 列出最近的记录")
        print("  python scripts/test_upload.py <log_id>  # 查看指定记录的详细信息")

