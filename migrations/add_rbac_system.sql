-- 添加 RBAC 角色权限管理系统
-- 执行时间：2025-01-XX

-- 1. 创建权限表
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建角色表
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

-- 4. 创建用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- 6. 删除旧的 role 字段（如果存在）
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- 7. 插入默认权限
INSERT INTO permissions (name, display_name, description, category) VALUES
    -- 记录相关权限
    ('log.create', '创建记录', '可以创建新的图片记录', 'log'),
    ('log.edit', '编辑记录', '可以编辑现有的图片记录', 'log'),
    ('log.delete', '删除记录', '可以删除图片记录', 'log'),
    ('log.view', '查看记录', '可以查看图片记录详情', 'log'),
    
    -- 用户管理权限
    ('user.view', '查看用户', '可以查看用户列表', 'user'),
    ('user.edit', '编辑用户', '可以编辑用户信息', 'user'),
    ('user.delete', '删除用户', '可以删除用户', 'user'),
    ('user.manage_roles', '管理用户角色', '可以分配和移除用户角色', 'user'),
    
    -- 角色权限管理
    ('role.view', '查看角色', '可以查看角色列表', 'role'),
    ('role.create', '创建角色', '可以创建新角色', 'role'),
    ('role.edit', '编辑角色', '可以编辑角色信息', 'role'),
    ('role.delete', '删除角色', '可以删除角色', 'role'),
    ('role.manage_permissions', '管理角色权限', '可以分配和移除角色权限', 'role'),
    
    -- 系统管理权限
    ('system.admin_panel', '访问管理后台', '可以访问系统管理后台', 'system'),
    ('system.config', '系统配置', '可以修改系统配置', 'system')
ON CONFLICT (name) DO NOTHING;

-- 8. 插入默认角色
INSERT INTO roles (name, display_name, description, is_system) VALUES
    ('admin', '管理员', '系统管理员，拥有所有权限', TRUE),
    ('editor', '编辑者', '可以创建和编辑记录', TRUE),
    ('user', '普通用户', '只能查看和收藏记录', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 9. 为默认角色分配权限
-- 管理员：所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- 编辑者：记录相关权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'editor'
  AND p.category = 'log'
ON CONFLICT DO NOTHING;

-- 普通用户：只有查看和收藏权限（收藏不需要特殊权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user'
  AND p.name = 'log.view'
ON CONFLICT DO NOTHING;

-- 10. 为现有用户分配默认角色（如果有旧数据）
-- 注意：这里假设之前有 role 字段，如果没有可以跳过
-- 由于我们已经删除了 role 字段，这里只是示例，实际使用时需要根据情况调整

-- 11. 添加注释
COMMENT ON TABLE permissions IS '权限表';
COMMENT ON TABLE roles IS '角色表';
COMMENT ON TABLE role_permissions IS '角色权限关联表';
COMMENT ON TABLE user_roles IS '用户角色关联表';
COMMENT ON COLUMN roles.is_system IS '是否为系统角色（不可删除）';
COMMENT ON COLUMN permissions.category IS '权限分类：log（记录）、user（用户）、role（角色）、system（系统）';

