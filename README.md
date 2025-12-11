# AI 绘图资产归档系统 (AIGC Asset Vault)

一个基于 PostgreSQL + RustFS 的存算分离架构系统，用于管理和归档 AI 绘图资产、提示词和生成参数。

## ✨ 功能特性

- 📝 **生成记录管理**：支持 txt2img（文生图）和 img2img（图生图）两种模式
- 🏷️ **标签系统**：支持工具标签（如 Stable Diffusion WebUI、ComfyUI）和模型标签（如 SDXL、LoRA）
- 🔍 **智能搜索**：支持标题模糊搜索、标签筛选、类型筛选
- 🖼️ **图片管理**：自动生成缩略图，支持多图片上传和管理
- 📊 **详情查看**：全屏预览、轮播切换、参数完整展示
- ✏️ **编辑删除**：支持记录的编辑和删除操作

## 🛠️ 技术栈

- **前端**：React 18 + TypeScript + Vite + Ant Design
- **后端**：FastAPI + Python 3.11+
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
│   └── package.json
├── backend/               # FastAPI 后端应用
│   ├── app/
│   │   ├── api/          # API 路由
│   │   ├── models/       # 数据模型
│   │   ├── services/     # 业务服务
│   │   └── utils/        # 工具函数
│   ├── scripts/          # 工具脚本
│   └── requirements.txt
├── migrations/            # 数据库迁移脚本
├── docker-compose.yml    # Docker Compose 配置（统一配置，支持镜像和本地构建）
├── Dockerfile.backend     # 后端 Dockerfile
├── Dockerfile.frontend    # 前端 Dockerfile
└── nginx.conf.template    # Nginx 配置模板
```

## 🚀 快速开始

### 前置要求

- Python 3.11+（本地开发）
- Node.js 18+（本地开发）
- PostgreSQL 15+（或使用 Docker 提供的数据库）
- RustFS/S3 兼容存储服务（或使用 MinIO）
- Docker 和 Docker Compose（Docker 部署）

### 本地开发

#### 1. 克隆项目

```bash
git clone <repository-url>
cd aigcvault
```

#### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

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

# CORS 配置
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# 日志配置
LOG_LEVEL=INFO
```

#### 3. 启动后端

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

后端将在 `http://localhost:8000` 启动。

#### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端将在 `http://localhost:5173` 启动。

#### 5. 验证配置

```bash
# 验证数据库连接
cd backend
python scripts/verify_db.py

# 验证 RustFS 连接
python scripts/verify_rustfs.py
```

### Docker 部署

推荐使用 Docker 部署，详细步骤请参考 [DOCKER部署指南.md](./DOCKER部署指南.md)。

#### 快速部署

`docker-compose.yml` 同时支持两种方式：

**方式一：使用 Docker Hub 镜像**
```bash
# 1. 编辑 docker-compose.yml，取消注释 image 行并设置镜像名称
# 2. 配置环境变量（创建 .env 文件）
# 3. 启动服务
docker-compose up -d
```

**方式二：本地构建镜像**
```bash
# 1. 确保 docker-compose.yml 中的 build 配置已启用（默认已启用）
# 2. 配置环境变量（创建 .env 文件）
# 3. 构建并启动
docker-compose up -d --build
```

## 📖 API 文档

启动后端服务后，访问以下地址查看 API 文档：

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 主要 API 端点

- `GET /api/logs` - 获取生成记录列表（支持搜索、筛选、分页）
- `POST /api/logs` - 创建新的生成记录
- `GET /api/logs/{id}` - 获取记录详情
- `PUT /api/logs/{id}` - 更新记录
- `DELETE /api/logs/{id}` - 删除记录
- `GET /api/assets/{file_key}` - 获取图片资源
- `GET /api/tags/tools` - 获取所有工具标签
- `GET /api/tags/models` - 获取所有模型标签

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
| `LOG_LEVEL` | 日志级别 | `INFO` |

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

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[添加许可证信息]

## 🔗 相关文档

- [Docker 部署指南](./DOCKER部署指南.md) - 详细的 Docker 部署教程
