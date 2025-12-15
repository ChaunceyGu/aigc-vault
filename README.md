# AI 绘图资产归档系统 (AIGC Asset Vault)

一个基于 PostgreSQL + RustFS 的存算分离架构系统，用于管理和归档 AI 绘图资产、提示词和生成参数。

## ✨ 功能特性

- 📝 **生成记录管理**：支持 txt2img（文生图）和 img2img（图生图）两种模式
- 🏷️ **智能标签系统**：支持工具标签（如 Stable Diffusion WebUI、ComfyUI）和模型标签（如 SDXL、LoRA），自动补全和最近使用
- 🔍 **智能搜索**：支持标题模糊搜索、标签筛选、类型筛选，搜索防抖优化
- 🖼️ **图片管理**：自动生成缩略图，支持多图片上传和管理，支持批量下载（ZIP）
- 📊 **详情查看**：全屏预览、轮播切换、参数完整展示，支持键盘快捷键（ESC关闭、方向键切换）
- ✏️ **编辑删除**：支持记录的编辑和删除操作，密码保护
- 📦 **输出组管理**：支持为每条记录创建多个输出组，每个组可独立设置工具、模型和图片
- 📥 **批量操作**：支持批量下载、批量删除
- 🎨 **视图切换**：支持网格视图和瀑布流视图，瀑布流随机展示图片
- 🔒 **密码保护**：创建/编辑记录需要密码验证
- 🚫 **NSFW 内容管理**：支持标记敏感内容，自动打码保护，统一灯箱预览体验
- 🌐 **外网访问支持**：通过API代理实现文件访问，无需暴露内部端口
- ⚡ **性能优化**：图片懒加载、防抖搜索、智能缓存、组件优化
- 🔄 **CI/CD 集成**：GitHub Actions 自动构建和推送 Docker 镜像
- 🔐 **安全扫描**：集成 Trivy 进行容器漏洞扫描

## 🛠️ 技术栈

- **前端**：React 18 + TypeScript + Vite + Ant Design
- **后端**：FastAPI + Python 3.12+
- **数据库**：PostgreSQL 15+（支持数组和 GIN 索引）
- **文件存储**：RustFS（S3 兼容存储）

## 📁 项目结构

```
.
├── frontend/              # React 前端应用
│   ├── src/
│   │   ├── components/   # React 组件
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # API 服务
│   │   └── utils/        # 工具函数
│   ├── start.sh          # 前端启动脚本
│   └── package.json
├── backend/               # FastAPI 后端应用
│   ├── app/
│   │   ├── api/          # API 路由
│   │   ├── models/       # 数据模型
│   │   ├── services/     # 业务服务
│   │   └── utils/        # 工具函数
│   ├── scripts/          # 工具脚本
│   ├── start.sh          # 后端启动脚本
│   └── requirements.txt
├── migrations/           # 数据库迁移脚本
├── scripts/              # 项目脚本
│   └── backup_db.sh     # 数据库备份脚本
├── docker-compose.yml    # Docker Compose 配置
├── Dockerfile.api        # API 服务 Dockerfile
├── Dockerfile.web        # Web 服务 Dockerfile
├── setup.sh              # 开发环境设置脚本
├── 启动所有服务.sh        # 启动所有服务脚本
├── 停止所有服务.sh        # 停止所有服务脚本
├── env.example           # 环境变量示例
└── nginx.conf.template   # Nginx 配置模板
```

## 🚀 快速开始

### 前置要求

- **Python**：3.12+
- **Node.js**：18+
- **PostgreSQL**：15+（支持数组和 GIN 索引）
- **RustFS/S3**：S3 兼容存储服务（或使用 MinIO）
- **Docker**（可选）：用于 Docker 部署

### 本地开发

#### 1. 克隆项目

```bash
git clone https://github.com/ChaunceyGu/aigc-vault.git
cd aigc-vault
```

#### 2. 配置环境变量

复制环境变量示例文件并修改配置：

```bash
cp env.example .env
```

编辑 `.env` 文件，配置数据库和存储服务：

```env
# 数据库配置
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aigc_vault

# RustFS/S3 配置
RUSTFS_ENDPOINT_URL=http://localhost:9900
RUSTFS_ACCESS_KEY=your_access_key
RUSTFS_SECRET_KEY=your_secret_key
RUSTFS_BUCKET=aigcvault
RUSTFS_REGION=us-east-1
RUSTFS_USE_SSL=false

# CORS 配置（多个地址用逗号分隔）
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# 编辑密码（用于创建/编辑记录时的密码验证）
EDIT_PASSWORD=your_edit_password_here

# 日志配置
LOG_LEVEL=INFO
```

#### 3. 设置开发环境

运行环境设置脚本：

```bash
./setup.sh
```

这个脚本会：
- 创建 Python 虚拟环境
- 安装 Python 依赖包
- 安装前端依赖

#### 4. 初始化数据库

```bash
cd backend
source venv/bin/activate
python scripts/init_db.py
```

#### 5. 启动服务

**方式一：使用启动脚本（推荐）**

```bash
# 启动所有服务（后端 + 前端）
./启动所有服务.sh

# 停止所有服务
./停止所有服务.sh
```

**方式二：分别启动**

```bash
# 启动后端服务
cd backend
./start.sh
```

后端将在 `http://localhost:8000` 启动。

```bash
# 启动前端服务（新终端）
cd frontend
npm run dev
```

前端将在 `http://localhost:5173` 启动。

#### 6. 验证配置

```bash
# 验证数据库连接
cd backend
source venv/bin/activate
python scripts/verify_db.py

# 验证 RustFS 连接
python scripts/verify_rustfs.py
```

## 📖 API 文档

启动后端服务后，访问以下地址查看 API 文档：

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### 主要 API 端点

**记录管理：**
- `GET /api/logs` - 获取生成记录列表（支持搜索、筛选、分页）
- `POST /api/logs` - 创建新的生成记录
- `GET /api/logs/{id}` - 获取记录详情
- `PUT /api/logs/{id}` - 更新记录
- `DELETE /api/logs/{id}` - 删除记录

**输出组管理：**
- `POST /api/logs/{id}/output-groups` - 为记录添加新的输出组
- `PUT /api/logs/{id}/output-groups/{group_id}` - 更新输出组（修改工具、模型，添加或删除图片）
- `DELETE /api/logs/{id}/output-groups/{group_id}` - 删除输出组

**资源管理：**
- `GET /api/assets/{file_key}/stream` - 流式传输图片（用于显示）
- `GET /api/assets/{file_key}/download` - 下载图片文件
- `GET /api/assets/{file_key}/url` - 获取图片代理 URL

**标签管理：**
- `GET /api/tags/tools` - 获取所有工具标签
- `GET /api/tags/models` - 获取所有模型标签
- `GET /api/tags/stats` - 获取标签统计信息（用于筛选器）

**配置：**
- `GET /api/config/edit-password` - 获取编辑密码配置
- `GET /api/config/version` - 获取应用版本信息

## 🔧 配置说明

### 数据库配置

支持 PostgreSQL 数据库，需要启用数组和 GIN 索引功能。数据库连接字符串格式：

```
postgresql://用户名:密码@主机:端口/数据库名
```

### RustFS/S3 配置

支持任何 S3 兼容的存储服务，包括：

- RustFS
- MinIO
- AWS S3
- 阿里云 OSS（S3 兼容模式）
- 腾讯云 COS（S3 兼容模式）

### 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | `postgresql://postgres:postgres@localhost:5432/aigc_vault` |
| `RUSTFS_ENDPOINT_URL` | S3 兼容存储服务地址 | `http://localhost:9900` |
| `RUSTFS_ACCESS_KEY` | S3 Access Key | - |
| `RUSTFS_SECRET_KEY` | S3 Secret Key | - |
| `RUSTFS_BUCKET` | 存储桶名称 | `aigcvault` |
| `RUSTFS_REGION` | 区域 | `us-east-1` |
| `RUSTFS_USE_SSL` | 是否使用 SSL | `false` |
| `CORS_ORIGINS` | 允许的 CORS 源（逗号分隔） | `http://localhost:5173` |
| `EDIT_PASSWORD` | 编辑密码（用于创建/编辑记录） | - |
| `LOG_LEVEL` | 日志级别 | `INFO` |

## 🐳 Docker 部署

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- PostgreSQL 15+（可选，可使用 Docker 提供的数据库）
- RustFS/S3 兼容存储服务（如 MinIO）

### 快速部署

#### 1. 准备配置文件

创建 `.env` 文件（在项目根目录）：

```env
# 数据库配置
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/aigc_vault

# RustFS/S3 配置
RUSTFS_ENDPOINT_URL=http://192.168.1.100:9900
RUSTFS_ACCESS_KEY=your_access_key
RUSTFS_SECRET_KEY=your_secret_key
RUSTFS_BUCKET=aigcvault
RUSTFS_REGION=us-east-1
RUSTFS_USE_SSL=false

# CORS 配置（修改为你的实际访问地址）
CORS_ORIGINS=http://localhost,http://localhost:80,http://192.168.1.100

# 编辑密码
EDIT_PASSWORD=your_edit_password_here

# 日志配置
LOG_LEVEL=INFO
```

#### 2. 启动服务

**使用 Docker Hub 镜像（推荐）：**

```bash
docker-compose up -d
```

**Docker Hub 镜像地址**：
- API 服务：`chaunceygu178/aigc-vault-api:latest`
- Web 服务：`chaunceygu178/aigc-vault-web:latest`

**本地构建镜像：**

编辑 `docker-compose.yml`，注释掉 `image` 行，取消注释 `build` 部分，然后运行：

```bash
docker-compose up -d --build
```

#### 3. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres
```

#### 4. 验证部署

- 访问前端：`http://localhost`（或你的服务器 IP）
- 检查后端健康状态：`http://localhost:8000/api/health`
- 查看 API 文档：`http://localhost:8000/docs`

### Docker 管理命令

```bash
# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 进入容器
docker-compose exec api bash
docker-compose exec postgres psql -U postgres -d aigc_vault
```

### 使用 MinIO（测试环境）

```bash
# 启动 MinIO
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9900:9900 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9900"

# 访问 MinIO 控制台：http://localhost:9900
# 创建存储桶：aigcvault
# 创建 Access Key 和 Secret Key
```

## 🔄 CI/CD 部署

项目已集成 GitHub Actions，支持自动构建和推送 Docker 镜像。

### 配置 GitHub Actions

1. **设置 Docker Hub 密钥**：
   - 在 GitHub 仓库设置中添加以下 Secrets：
     - `DOCKER_USERNAME`：Docker Hub 用户名
     - `DOCKER_PASSWORD`：Docker Hub 访问令牌

2. **工作流触发**：
   - 推送到 `main`/`master` 分支：构建并推送 `latest` 标签
   - 推送版本标签（如 `v1.1.0`）：构建并推送语义化版本标签
   - Pull Request：仅运行代码质量检查

3. **自动构建**：
   - 代码质量检查（ESLint、TypeScript、flake8）
   - 构建 Docker 镜像
   - 安全扫描（Trivy）
   - 推送到 Docker Hub

详细配置请参考 `.github/workflows/docker-build.yml`。

## 🔄 CI/CD 部署

项目已集成 GitHub Actions，支持自动构建和推送 Docker 镜像。

### 配置 GitHub Actions

1. **设置 Docker Hub 密钥**：
   - 在 GitHub 仓库设置中添加以下 Secrets：
     - `DOCKER_USERNAME`：Docker Hub 用户名
     - `DOCKER_PASSWORD`：Docker Hub 访问令牌

2. **工作流触发**：
   - 推送到 `main`/`master` 分支：构建并推送 `latest` 标签
   - 推送版本标签（如 `v1.1.0`）：构建并推送语义化版本标签（`v1.1.0`、`v1.1`、`v1`、`latest`）
   - Pull Request：仅运行代码质量检查

3. **自动构建流程**：
   - 代码质量检查（ESLint、TypeScript、flake8）
   - 构建 Docker 镜像
   - 安全扫描（Trivy）
   - 推送到 Docker Hub

详细配置请参考 `.github/workflows/docker-build.yml`。

## 📝 开发指南

### 数据库迁移

数据库初始化脚本位于 `migrations/init.sql`，首次部署时会自动执行。

**输出组功能**：
- 支持为每条记录创建多个输出组
- 每个输出组可独立设置工具、模型和图片
- 兼容旧数据格式（自动迁移）

**输出组功能**：
- 支持为每条记录创建多个输出组
- 每个输出组可独立设置工具、模型和图片
- 兼容旧数据格式（自动迁移）

### 项目脚本

后端 `scripts/` 目录包含以下工具脚本：

- `init_db.py` - 初始化数据库
- `verify_db.py` - 验证数据库连接
- `verify_rustfs.py` - 验证 RustFS 连接
- `test_upload.py` - 测试文件上传功能
- `check_tags.py` - 检查标签数据

### 数据库备份

```bash
./scripts/backup_db.sh
```

### 前端开发

```bash
cd frontend
npm run dev      # 开发模式
npm run build    # 构建生产版本
npm run preview  # 预览生产构建
```

### 后端开发

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 🔒 安全说明

### 密码保护

系统支持为创建/编辑记录设置密码保护：

1. 在 `.env` 文件中设置 `EDIT_PASSWORD`
2. 创建或编辑记录时需要输入密码
3. 密码验证状态会缓存 24 小时（存储在 sessionStorage）

### NSFW 内容管理

- 创建记录时可以标记为 NSFW 内容
- NSFW 图片会自动打码（模糊处理），简洁的水印提示
- 详情页可以切换显示/隐藏 NSFW 内容
- 下载时会自动获取原始图片（未打码版本）
- 统一的灯箱预览体验，支持点击遮罩层关闭

### 外网访问配置

系统支持通过API代理访问文件，无需暴露内部RustFS端口：

1. 配置 `RUSTFS_ENDPOINT_URL` 为内部IP（如 `http://192.168.31.3:9900`）
2. 只暴露 Docker 的 web 端口（80端口）
3. 所有图片访问和下载都通过 `/api/assets/{file_key}/stream` 和 `/api/assets/{file_key}/download` 代理
4. 支持外网访问，无需暴露8000端口和9900端口

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

- 项目地址：[https://github.com/ChaunceyGu/aigc-vault](https://github.com/ChaunceyGu/aigc-vault)
- 问题反馈：[Issues](https://github.com/ChaunceyGu/aigc-vault/issues)

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 许可证。

## 📅 更新日志

### v1.1.0 (最新)

**新功能：**
- ✅ 输出组管理：支持为每条记录创建多个输出组，每个组可独立设置工具、模型和图片
- ✅ 外网访问支持：通过API代理实现文件访问，无需暴露内部RustFS端口
- ✅ 版本信息同步：前后端版本信息同步显示，支持语义化版本
- ✅ GitHub Actions CI/CD：自动构建和推送 Docker 镜像到 Docker Hub
- ✅ 安全扫描：集成 Trivy 进行容器漏洞扫描并上报到 GitHub Security

**优化改进：**
- ✅ 统一图片预览体验：普通图片和NSFW图片使用相同的灯箱样式
- ✅ 搜索防抖优化：减少不必要的API请求
- ✅ 图片加载优化：添加重试机制，提升加载成功率
- ✅ 组件性能优化：使用 React.memo 优化渲染性能
- ✅ 瀑布流随机展示：每次刷新显示不同的随机图片
- ✅ 移动端体验优化：响应式布局，优化手机端交互
- ✅ 图片加载体验：Shimmer 骨架屏、淡入动画、错误处理

**Bug修复：**
- ✅ 修复NSFW图片需要关闭两次的问题
- ✅ 修复编辑页面新增图片不显示的问题
- ✅ 修复筛选栏无法读取工具和模型的问题
- ✅ 修复图片在外网无法访问的问题

### v1.0.0

**基础功能：**
- ✅ 密码保护功能（创建/编辑记录）
- ✅ NSFW 内容管理（自动打码、显示/隐藏切换）
- ✅ 优化的标签输入组件（自动补全、快速添加）
- ✅ 视图切换功能（网格视图/瀑布流视图）
- ✅ 图片下载功能（单张/批量 ZIP）
- ✅ 排序功能（按时间/标题）
- ✅ 批量操作（批量删除/下载）
- ✅ 搜索快捷键支持
- ✅ 性能优化（防抖、缓存、懒加载）
- ✅ 优化的 UI/UX 体验
