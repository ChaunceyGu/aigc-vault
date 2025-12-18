# 开发指南

本文档提供开发环境设置、代码结构、调试技巧等信息。

## 目录

- [开发环境设置](#开发环境设置)
- [代码结构](#代码结构)
- [开发工作流](#开发工作流)
- [数据库迁移](#数据库迁移)
- [调试技巧](#调试技巧)
- [版本发布](#版本发布)

## 开发环境设置

### 前置要求

- Python 3.12+
- Node.js 18+
- PostgreSQL 15+
- RustFS/S3 兼容存储服务

### 快速设置

```bash
# 1. 克隆项目
git clone https://github.com/ChaunceyGu/aigc-vault.git
cd aigc-vault

# 2. 设置开发环境
./setup.sh

# 3. 配置环境变量
cp env.example .env
# 编辑 .env 文件

# 4. 初始化数据库
cd backend
source venv/bin/activate
python scripts/init_db.py

# 5. 启动服务
cd ..
./启动所有服务.sh
```

## 代码结构

### 前端结构

```
frontend/
├── src/
│   ├── components/       # 可复用组件
│   │   ├── layout/      # 布局组件
│   │   └── ...          # 其他组件
│   ├── pages/           # 页面组件
│   ├── services/        # API 服务
│   ├── contexts/        # React Context
│   └── utils/           # 工具函数
├── package.json
└── vite.config.ts
```

### 后端结构

```
backend/
├── app/
│   ├── api/             # API 路由
│   ├── models/          # 数据模型
│   ├── services/        # 业务服务
│   ├── utils/           # 工具函数
│   ├── config.py        # 配置管理
│   ├── database.py      # 数据库连接
│   └── main.py          # 应用入口
├── scripts/             # 工具脚本
└── requirements.txt
```

## 开发工作流

### 前端开发

```bash
cd frontend

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# TypeScript 类型检查
npx tsc --noEmit
```

### 后端开发

```bash
cd backend
source venv/bin/activate

# 启动开发服务器（自动重载）
./start.sh

# 或手动启动
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 代码检查
flake8 app/
```

### 数据库操作

```bash
cd backend
source venv/bin/activate

# 初始化数据库
python scripts/init_db.py

# 执行迁移
python scripts/apply_migration.py migrations/your_migration.sql

# 验证数据库连接
python scripts/verify_db.py
```

## 数据库迁移

### 迁移脚本位置

所有迁移脚本位于 `migrations/` 目录：

- `init.sql` - 基础表结构
- `add_output_groups.sql` - 输出组功能
- `add_user_system.sql` - 用户账号系统
- `add_rbac_system.sql` - RBAC 权限系统

### 创建新迁移

1. 在 `migrations/` 目录创建新的 SQL 文件
2. 编写迁移 SQL
3. 使用脚本执行迁移：

```bash
python scripts/apply_migration.py migrations/your_migration.sql
```

### 迁移脚本示例

```sql
-- migrations/add_new_feature.sql
BEGIN;

-- 创建新表
CREATE TABLE IF NOT EXISTS new_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引
CREATE INDEX idx_new_table_name ON new_table(name);

COMMIT;
```

## 调试技巧

### 前端调试

1. **浏览器开发者工具**：
   - 查看网络请求
   - 检查 React 组件状态
   - 查看控制台错误

2. **React DevTools**：
   - 安装 React DevTools 浏览器扩展
   - 检查组件树和状态

3. **Vite HMR**：
   - 修改代码后自动热更新
   - 查看终端中的编译错误

### 后端调试

1. **日志输出**：
   ```python
   import logging
   logger = logging.getLogger(__name__)
   logger.debug("调试信息")
   logger.info("一般信息")
   logger.error("错误信息")
   ```

2. **API 文档**：
   - 访问 `http://localhost:8000/docs` 测试 API
   - 使用 Swagger UI 交互式测试

3. **数据库查询**：
   ```bash
   # 进入数据库
   docker-compose exec postgres psql -U postgres -d aigc_vault
   
   # 或本地
   psql -U postgres -d aigc_vault
   ```

### 常见问题

1. **端口被占用**：
   ```bash
   # 查找占用端口的进程
   lsof -i :8000
   # 或
   netstat -tulpn | grep :8000
   ```

2. **依赖问题**：
   ```bash
   # 前端
   cd frontend && rm -rf node_modules package-lock.json && npm install
   
   # 后端
   cd backend && rm -rf venv && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
   ```

## 版本发布

### 发布流程

1. **更新版本号**：
   - 在 `README.md` 中更新版本号（`### vX.Y.Z (最新)`）
   - 更新 `CHANGELOG.md`

2. **运行发布脚本**：
   ```bash
   ./aigc-push-local.sh
   ```

3. **脚本功能**：
   - 自动从 README.md 读取当前版本
   - 支持版本号递增（Patch/Minor/Major）
   - 检测标签是否已存在，自动递增避免构建失败
   - 自动生成 Git 标签
   - 推送到 GitHub 并触发 CI/CD

### 版本号规则

- **Patch**（v1.2.3 → v1.2.4）：修复 bug 或小改动
- **Minor**（v1.2.3 → v1.3.0）：新功能或改进
- **Major**（v1.2.3 → v2.0.0）：重大变更或破坏性更新

### CI/CD 流程

推送标签后，GitHub Actions 会自动：

1. 运行代码质量检查（ESLint、TypeScript、flake8）
2. 构建 Docker 镜像
3. 安全扫描（Trivy）
4. 推送到 Docker Hub

## 项目脚本

### 后端脚本

位于 `backend/scripts/`：

- `init_db.py` - 初始化数据库
- `init_admin.py` - 初始化默认管理员账号
- `verify_db.py` - 验证数据库连接
- `verify_rustfs.py` - 验证 RustFS 连接
- `test_upload.py` - 测试文件上传功能
- `check_tags.py` - 检查标签数据
- `apply_migration.py` - 执行数据库迁移

### 项目脚本

位于项目根目录：

- `setup.sh` - 设置开发环境
- `启动所有服务.sh` - 启动所有服务
- `停止所有服务.sh` - 停止所有服务
- `aigc-push-local.sh` - 版本发布脚本
- `scripts/backup_db.sh` - 数据库备份

## 代码规范

### 前端

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用函数式组件和 Hooks
- 组件使用 PascalCase 命名
- 文件使用 camelCase 命名

### 后端

- 使用 Python 类型提示
- 遵循 PEP 8 代码风格
- 使用 FastAPI 类型验证
- 函数和变量使用 snake_case 命名
- 类使用 PascalCase 命名

## 测试

### 前端测试

```bash
cd frontend
npm test
```

### 后端测试

```bash
cd backend
source venv/bin/activate
pytest
```

## 相关文档

- [安装部署](./INSTALLATION.md)
- [配置说明](./CONFIGURATION.md)
- [API 文档](./API.md)

