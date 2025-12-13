-- 添加输出组功能
-- 版本: 1.2
-- 日期: 2025-01-XX

-- 创建输出组表（每个平台&模型组合对应一组输出图片）
CREATE TABLE IF NOT EXISTS log_output_groups (
    id SERIAL PRIMARY KEY,
    log_id INTEGER,
    
    -- 【工具标签】该组使用的工具
    tools TEXT[],
    
    -- 【模型标签】该组使用的模型
    models TEXT[],
    
    -- 【排序】用于控制组的显示顺序
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加外键约束
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'log_output_groups_log_id_fkey'
    ) THEN
        ALTER TABLE log_output_groups 
        ADD CONSTRAINT log_output_groups_log_id_fkey 
        FOREIGN KEY (log_id) REFERENCES gen_logs(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 在log_assets表中添加output_group_id字段，将输出图片关联到对应的组
ALTER TABLE log_assets ADD COLUMN IF NOT EXISTS output_group_id INTEGER;

-- 添加外键约束（如果字段已存在但约束不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'log_assets_output_group_id_fkey'
    ) THEN
        ALTER TABLE log_assets 
        ADD CONSTRAINT log_assets_output_group_id_fkey 
        FOREIGN KEY (output_group_id) REFERENCES log_output_groups(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_output_groups_log_id ON log_output_groups (log_id);
CREATE INDEX IF NOT EXISTS idx_output_groups_tools ON log_output_groups USING GIN (tools);
CREATE INDEX IF NOT EXISTS idx_output_groups_models ON log_output_groups USING GIN (models);
CREATE INDEX IF NOT EXISTS idx_assets_output_group_id ON log_assets (output_group_id);

-- 添加注释
COMMENT ON TABLE log_output_groups IS '输出组表，用于存储每条记录的不同平台&模型组合';
COMMENT ON COLUMN log_output_groups.tools IS '该组使用的工具标签数组';
COMMENT ON COLUMN log_output_groups.models IS '该组使用的模型标签数组';
COMMENT ON COLUMN log_assets.output_group_id IS '输出图片所属的输出组ID（仅output类型有效）';

