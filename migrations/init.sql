-- AI 绘图资产归档系统 - 数据库初始化脚本
-- 版本: 1.0
-- 日期: 2025-12-09

-- 主表：生成日志 (gen_logs)
CREATE TABLE IF NOT EXISTS gen_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 【标题】用于人眼快速识别，支持模糊搜索
    title VARCHAR(200) NOT NULL, 
    
    -- 【类型】决定详情页的渲染逻辑
    log_type VARCHAR(20) NOT NULL,  -- 枚举值: 'txt2img', 'img2img'
    
    -- 【标签系统】利用 PG 数组存储，支持多选
    -- 例如: ['Stable Diffusion WebUI', 'ComfyUI']
    tools TEXT[],   
    -- 例如: ['SDXL 1.0', 'AWPortrait', 'LoRA:Ghibli']
    models TEXT[],  
    
    -- 【核心参数】非结构化长文本，便于直接 Copy/Paste
    prompt TEXT,       -- 正向/负向提示词
    params_note TEXT   -- 参数全记录 (Seed, Steps, CFG, Sampler...)
);

-- 从表：资源附件 (log_assets)
CREATE TABLE IF NOT EXISTS log_assets (
    id SERIAL PRIMARY KEY,
    log_id INTEGER REFERENCES gen_logs(id) ON DELETE CASCADE,
    
    -- 【文件索引】RustFS 返回的唯一 Key 或 相对路径
    file_key TEXT NOT NULL,
    
    -- 【类型区分】
    -- 'input': 图生图的参考底图 (线稿、姿势图等)
    -- 'output': AI 生成的最终样张
    asset_type VARCHAR(20) NOT NULL, 
    
    -- 【备注】核心需求：仅用于 'input' 类型
    -- 用于记录这张底图的作用，如 "ControlNet Canny 权重0.8"
    note TEXT,
    
    -- 【排序】可选，用于控制详情页图片的展示顺序
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引设计：利用 GIN 索引加速数组包含查询 (例如查所有用过 'SDXL' 的记录)
CREATE INDEX IF NOT EXISTS idx_logs_tools ON gen_logs USING GIN (tools);
CREATE INDEX IF NOT EXISTS idx_logs_models ON gen_logs USING GIN (models);
CREATE INDEX IF NOT EXISTS idx_logs_title ON gen_logs (title);
CREATE INDEX IF NOT EXISTS idx_logs_type ON gen_logs (log_type);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON gen_logs (created_at DESC);

-- 资源附件表索引
CREATE INDEX IF NOT EXISTS idx_assets_log_id ON log_assets (log_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON log_assets (asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_file_key ON log_assets (file_key);

-- 添加约束
ALTER TABLE gen_logs ADD CONSTRAINT chk_log_type CHECK (log_type IN ('txt2img', 'img2img'));
ALTER TABLE log_assets ADD CONSTRAINT chk_asset_type CHECK (asset_type IN ('input', 'output'));

-- 添加注释
COMMENT ON TABLE gen_logs IS 'AI 绘图生成日志主表';
COMMENT ON TABLE log_assets IS '生成日志关联的图片资源表';
COMMENT ON COLUMN gen_logs.log_type IS '生成类型: txt2img(文生图) 或 img2img(图生图)';
COMMENT ON COLUMN log_assets.asset_type IS '资源类型: input(参考素材) 或 output(生成结果)';
COMMENT ON COLUMN log_assets.note IS '备注，主要用于 input 类型说明底图的作用';

