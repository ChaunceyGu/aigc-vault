# AI 绘图资产归档系统 (AIGC Asset Vault)

[![GitHub](https://img.shields.io/badge/GitHub-ChaunceyGu%2Faigc--vault-blue)](https://github.com/ChaunceyGu/aigc-vault)

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
├── Dockerfile.api         # API 服务 Dockerfile
├── Dockerfile.web         # Web 服务 Dockerfile
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
git clone https://github.com/ChaunceyGu/aigc-vault.git
cd aigc-vault
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

**提示**：如果安装了 Make，可以使用 `make verify` 快速验证配置。

### Docker 部署

推荐使用 Docker 部署，详细步骤请参考 [DOCKER部署指南.md](./DOCKER部署指南.md)。

#### 快速部署

`docker-compose.yml` 默认使用 Docker Hub 镜像，也支持本地构建：

**方式一：使用 Docker Hub 镜像（默认，推荐）**
```bash
# 1. 配置环境变量（创建 .env 文件）
# 2. 启动服务（自动从 Docker Hub 拉取镜像）
docker-compose up -d
```

**方式二：本地构建镜像**
```bash
# 1. 编辑 docker-compose.yml，注释掉 image 行，取消注释 build 部分
# 2. 配置环境变量（创建 .env 文件）
# 3. 构建并启动
docker-compose up -d --build
```

**Docker Hub 镜像地址**：
- API 服务：`chaunceygu178/aigc-vault-api:latest`
- Web 服务：`chaunceygu178/aigc-vault-web:latest`

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

- 项目地址：[https://github.com/ChaunceyGu/aigc-vault](https://github.com/ChaunceyGu/aigc-vault)
- 问题反馈：[Issues](https://github.com/ChaunceyGu/aigc-vault/issues)

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 许可证。

## 🔗 相关文档

- [Docker 部署指南](./DOCKER部署指南.md) - 详细的 Docker 部署教程

## 📅 更新日志

### 2025-12-11 更新

#### ✨ 新功能

1. **视图切换功能**
   - 支持网格视图和瀑布流视图两种展示模式
   - 视图模式自动保存，从详情页返回时保持原视图
   - 瀑布流视图：纯图片展示，图片根据实际尺寸自适应

2. **图片下载功能**
   - 支持单张图片下载
   - 支持批量下载选中记录的所有图片
   - 详情页支持下载全部图片
   - 智能文件命名（包含记录标题和序号）

3. **排序功能**
   - 支持按时间排序（最新优先/最旧优先）
   - 支持按标题排序（A-Z/Z-A）
   - 排序结果实时生效

4. **批量操作**
   - 批量选择记录
   - 批量删除记录
   - 批量下载图片

5. **用户体验优化**
   - 搜索快捷键：按 `/` 键快速聚焦搜索框
   - 返回顶部按钮：滚动时显示，点击平滑滚动到顶部
   - 空状态优化：提供创建记录的快捷入口
   - 复制反馈：复制成功后显示绿色对勾提示
   - 卡片悬停效果：更流畅的动画和阴影效果

#### 🐛 问题修复

1. **数据刷新问题**
   - 修复创建/编辑/删除记录后需要手动刷新的问题
   - 修复标签统计不自动更新的问题
   - 实现智能缓存清理机制

2. **排序功能修复**
   - 修复排序切换无效的问题
   - 确保排序结果正确应用

3. **详情页显示问题**
   - 修复详情页不显示的问题
   - 优化加载状态和错误处理

#### 🎨 UI/UX 优化

1. **列表视图重新设计**
   - 更现代化的卡片设计
   - 更紧凑的布局，减少空白
   - 智能图片展示（单图/多图自适应）

2. **瀑布流视图**
   - 纯图片展示，无任何标签和参数
   - 图片根据实际尺寸自适应
   - 响应式列数（2-5列根据屏幕宽度）

3. **视觉优化**
   - 更流畅的动画效果
   - 更好的悬停反馈
   - 优化的空状态和加载状态

## 📋 快速参考

### 环境变量配置
复制 `env.example` 为 `.env` 并修改配置：
```bash
cp env.example .env
```

### 数据库备份
```bash
# Linux/Mac
./scripts/backup_db.sh

# Windows
scripts\backup_db.bat
```

## 🛠️ 常用命令

如果安装了 Make，可以使用以下快捷命令：

```bash
make help          # 显示所有可用命令
make dev           # 启动开发环境
make up            # 启动 Docker 服务
make down          # 停止 Docker 服务
make logs          # 查看日志
make verify         # 验证配置
make backup-db      # 备份数据库
```

更多命令请查看 [Makefile](./Makefile) 或运行 `make help`。
