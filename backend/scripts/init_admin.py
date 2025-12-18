"""
初始化默认管理员账号
在首次部署时运行此脚本创建默认管理员
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole

def init_admin():
    """创建默认管理员账号"""
    db: Session = SessionLocal()
    try:
        # 检查是否已存在管理员
        admin_role = db.query(Role).filter(Role.name == 'admin').first()
        if not admin_role:
            print("错误：admin 角色不存在，请先运行数据库迁移脚本")
            return False
        
        # 检查是否已有管理员用户
        existing_admin = db.query(UserRole).join(Role).filter(Role.name == 'admin').first()
        if existing_admin:
            print("管理员账号已存在，跳过创建")
            return True
        
        # 从环境变量获取默认管理员信息
        default_username = os.getenv('DEFAULT_ADMIN_USERNAME', 'admin')
        default_password = os.getenv('DEFAULT_ADMIN_PASSWORD', 'admin123456')
        default_email = os.getenv('DEFAULT_ADMIN_EMAIL', None)
        
        # 检查用户名是否已存在
        existing_user = db.query(User).filter(User.username == default_username).first()
        if existing_user:
            # 如果用户存在但没有 admin 角色，则添加角色
            has_admin_role = db.query(UserRole).filter(
                UserRole.user_id == existing_user.id,
                UserRole.role_id == admin_role.id
            ).first()
            if not has_admin_role:
                db.add(UserRole(user_id=existing_user.id, role_id=admin_role.id))
                db.commit()
                print(f"已为用户 '{default_username}' 添加管理员角色")
            else:
                print(f"用户 '{default_username}' 已经是管理员")
            return True
        
        # 创建默认管理员账号
        hashed_password = User.hash_password(default_password)
        admin_user = User(
            username=default_username,
            email=default_email,
            hashed_password=hashed_password,
            is_active=True
        )
        db.add(admin_user)
        db.flush()
        
        # 分配管理员角色
        db.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))
        db.commit()
        
        print(f"✅ 默认管理员账号创建成功！")
        print(f"   用户名: {default_username}")
        print(f"   密码: {default_password}")
        print(f"   ⚠️  请尽快修改默认密码！")
        return True
        
    except Exception as e:
        print(f"❌ 创建默认管理员失败: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = init_admin()
    sys.exit(0 if success else 1)

