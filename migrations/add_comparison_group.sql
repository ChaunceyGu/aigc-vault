-- 添加对比组功能
-- 版本: 1.1
-- 日期: 2025-01-XX

-- 添加对比组ID字段（可选，用于关联同一主题/提示词的不同平台模型输出）
ALTER TABLE gen_logs ADD COLUMN IF NOT EXISTS comparison_group_id INTEGER;

-- 添加索引以加速查询同组记录
CREATE INDEX IF NOT EXISTS idx_logs_comparison_group_id ON gen_logs (comparison_group_id) WHERE comparison_group_id IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN gen_logs.comparison_group_id IS '对比组ID，相同ID的记录属于同一对比组，用于对比同一主题/提示词在不同平台模型上的输出效果';

