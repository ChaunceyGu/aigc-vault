# AI 绘图资产归档系统 (AIGC Asset Vault)

一个基于 PostgreSQL + RustFS 的存算分离架构系统，用于管理和归档 AI 绘图资产、提示词和生成参数。

## ✨ 功能特性

- 📝 **生成记录管理**：支持 txt2img（文生图）和 img2img（图生图）两种模式
- 🏷️ **智能标签系统**：支持工具标签（如 Stable Diffusion WebUI、ComfyUI）和模型标签（如 SDXL、LoRA），自动补全和最近使用
- 🔍 **智能搜索**：支持标题模糊搜索、标签筛选、类型筛选
- 🖼️ **图片管理**：自动生成缩略图，支持多图片上传和管理，支持批量下载（ZIP）
- 📊 **详情查看**：全屏预览、轮播切换、参数完整展示
- ✏️ **编辑删除**：支持记录的编辑和删除操作，密码保护
- 📥 **批量操作**：支持批量下载、批量删除
- 🎨 **视图切换**：支持网格视图和瀑布流视图
- 🔒 **密码保护**：创建/编辑记录需要密码验证
- 🚫 **NSFW 内容管理**：支持标记敏感内容，自动打码保护

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

- `GET /api/logs` - 获取生成记录列表（支持搜索、筛选、分页）
- `POST /api/logs` - 创建新的生成记录
- `GET /api/logs/{id}` - 获取记录详情
- `PUT /api/logs/{id}` - 更新记录
- `DELETE /api/logs/{id}` - 删除记录
- `GET /api/assets/{file_key}` - 获取图片资源
- `GET /api/assets/{file_key}/url` - 获取原始图片 URL
- `GET /api/tags/tools` - 获取所有工具标签
- `GET /api/tags/models` - 获取所有模型标签
- `GET /api/tags/stats` - 获取标签统计信息
- `GET /api/config/edit-password` - 获取编辑密码配置

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

## 📝 开发指南

### 数据库迁移

数据库初始化脚本位于 `migrations/init.sql`，首次部署时会自动执行。

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
- NSFW 图片会自动打码（模糊处理）
- 详情页可以切换显示/隐藏 NSFW 内容
- 下载时会自动获取原始图片（未打码版本）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

- 项目地址：[https://github.com/ChaunceyGu/aigc-vault](https://github.com/ChaunceyGu/aigc-vault)
- 问题反馈：[Issues](https://github.com/ChaunceyGu/aigc-vault/issues)

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 许可证。

## 📅 更新日志

### 最新更新

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
