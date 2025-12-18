-- 添加用户角色系统
-- 执行时间：2025-01-XX

-- 添加角色字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- 创建角色索引
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 更新现有用户为普通用户（如果还没有设置）
UPDATE users SET role = 'user' WHERE role IS NULL OR role = '';

-- 添加注释
COMMENT ON COLUMN users.role IS '用户角色：admin（管理员）、editor（编辑者）、user（普通用户）';

-- 角色说明：
-- admin: 管理员，可以管理账号，有后台管理权限
-- editor: 编辑者，可以上传、编辑图片记录
-- user: 普通用户，只能收藏

