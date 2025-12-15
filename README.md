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
- ⚡ **性能优化**：图片懒加载、防抖搜索、智能缓存、组件优化、API响应缓存、数据库查询优化
- 🖼️ **图片优化**：前端自动压缩、后端多尺寸支持、智能缓存策略、上传进度显示
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
# 数据库配置（本地开发使用 localhost）
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
- `GET /api/assets/{file_key}/stream?size={size}` - 流式传输图片（用于显示）
  - `size` 参数：`thumb`（缩略图）、`medium`（中等尺寸，1920px）、`original`（原图，默认）
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
| `DATABASE_URL` | PostgreSQL 数据库连接字符串<br/>- 本地开发：`postgresql://postgres:postgres@localhost:5432/aigc_vault`<br/>- Docker 部署：`postgresql://postgres:postgres@postgres:5432/aigc_vault`（使用服务名，无需暴露端口） | `postgresql://postgres:postgres@localhost:5432/aigc_vault` |
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

### 安全说明

**默认配置（推荐用于生产环境）：**
- ✅ 数据库端口不暴露到主机，仅在 Docker 内部网络可访问
- ✅ 后端 API 端口（8000）不暴露到主机，仅通过 Nginx 代理访问
- ✅ 仅暴露 Web 端口（80），所有请求通过 Nginx 代理
- ✅ 文件访问通过 API 代理，无需暴露 RustFS 端口

**如果需要从外部访问数据库：**
- 编辑 `docker-compose.yml`，取消 `postgres` 服务的 `ports` 注释
- 注意：暴露数据库端口会带来安全风险，建议仅在开发环境使用

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
- 检查后端健康状态：`http://localhost/api/health`（通过 Nginx 代理）
- 查看 API 文档：`http://localhost/docs`（通过 Nginx 代理）

**注意：**
- 默认配置下，数据库端口（5432）和 API 端口（8000）不暴露到主机
- 所有访问都通过 Web 端口（80）的 Nginx 代理
- 如果需要从外部访问数据库，需要修改 `docker-compose.yml` 暴露端口

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

# 访问数据库（通过容器内部网络，无需暴露端口）
docker-compose exec postgres psql -U postgres -d aigc_vault

# 如果需要从外部访问数据库，需要先暴露端口（见 docker-compose.yml 注释）
# 然后可以使用：psql -h localhost -p 5432 -U postgres -d aigc_vault
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

### 外网访问配置（安全部署）

系统支持通过 API 代理访问所有资源，无需暴露内部端口：

**默认安全配置：**
1. **数据库**：不暴露端口，仅在 Docker 内部网络可访问（`docker-compose.yml` 中 `postgres` 服务的 `ports` 已注释）
2. **后端 API**：不暴露端口，通过 Nginx 代理访问（`docker-compose.yml` 中 `api` 服务的 `ports` 可注释，但通常保留用于调试）
3. **文件存储**：配置 `RUSTFS_ENDPOINT_URL` 为内部IP（如 `http://192.168.31.3:9900`），通过 API 代理访问
4. **Web 服务**：仅暴露 80 端口，所有请求通过 Nginx 代理

**文件访问代理：**
- 图片显示：`/api/assets/{file_key}/stream`
- 文件下载：`/api/assets/{file_key}/download`
- 所有文件访问都通过后端 API 代理，无需暴露 RustFS 端口

**优势：**
- ✅ 更安全：数据库和内部服务不暴露到外网
- ✅ 更灵活：可以通过 Nginx 配置 HTTPS、访问控制等
- ✅ 更简单：只需暴露一个 Web 端口（80/443）

**如果需要从外部访问数据库：**
- 编辑 `docker-compose.yml`，取消 `postgres` 服务的 `ports` 注释
- 注意：暴露数据库端口会带来安全风险，建议仅在开发环境使用

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

- 项目地址：[https://github.com/ChaunceyGu/aigc-vault](https://github.com/ChaunceyGu/aigc-vault)
- 问题反馈：[Issues](https://github.com/ChaunceyGu/aigc-vault/issues)

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 许可证。

## ⚡ 性能优化

### 后端优化

1. **API 响应缓存**：
   - 标签统计、工具列表、模型列表使用内存缓存（5分钟）
   - 数据修改时自动清除相关缓存
   - 减少数据库查询，提升响应速度

2. **数据库查询优化**：
   - 优化列表查询，使用批量查询替代 N+1 查询
   - 减少数据库往返次数，提升查询效率

3. **图片处理优化**：
   - 支持多尺寸图片（缩略图、中等尺寸、原图）
   - 列表显示使用中等尺寸（1920px），减少传输量 60-80%
   - 智能缓存策略（中等尺寸缓存1年，原图缓存1小时）

### 前端优化

1. **图片压缩**：
   - 上传前自动压缩图片（>2MB 的图片）
   - 压缩参数：最大尺寸 1920x1920，质量 85%
   - 减少上传传输量 50-70%

2. **代码分割**：
   - 路由懒加载，减少首屏加载时间
   - 按需加载页面组件

3. **组件优化**：
   - 使用 React.memo 优化组件渲染
   - useCallback 和 useMemo 优化计算
   - 防抖搜索，减少 API 请求

### Nginx 优化

1. **Gzip 压缩**：
   - 压缩级别 6（性能与压缩率平衡）
   - 支持多种文件类型压缩
   - 减少传输量 60-80%

2. **静态资源缓存**：
   - 静态资源缓存 1 年
   - HTML 文件不缓存（确保更新及时）
   - 图片 API 根据尺寸设置不同缓存时间

3. **代理优化**：
   - 优化缓冲设置
   - 关闭静态资源访问日志

### 性能提升预期

- **标签 API**：缓存命中时响应时间从 ~100-200ms 降至 <1ms
- **列表查询**：批量查询减少数据库往返，提升 50-70%
- **首屏加载**：代码分割减少初始包大小，提升 20-30%
- **网络传输**：Gzip + 图片压缩，减少传输量 70-85%
- **图片加载**：中等尺寸图片 + 缓存，列表加载速度提升 60-80%
- **上传速度**：图片压缩后减少传输量 50-70%

## 📅 更新日志

### v1.2.0 (最新)

**性能优化：**
- ✅ 后端 API 响应缓存：标签统计、工具列表等使用内存缓存（5分钟）
- ✅ 数据库查询优化：批量查询替代 N+1 查询，提升查询效率 50-70%
- ✅ 前端代码分割：路由懒加载，减少首屏加载时间 20-30%
- ✅ Nginx 配置优化：Gzip 压缩、静态资源缓存、代理缓冲优化
- ✅ 图片上传优化：前端自动压缩（>2MB），减少传输量 50-70%
- ✅ 图片加载优化：多尺寸支持（缩略图/中等尺寸/原图），列表使用中等尺寸
- ✅ 智能缓存策略：中等尺寸图片缓存1年，原图缓存1小时
- ✅ 上传进度显示：实时显示上传进度

**优化改进：**
- ✅ 图片 API 支持 size 参数，可按需获取不同尺寸
- ✅ 列表显示自动使用中等尺寸图片，减少传输量 60-80%
- ✅ 详情页使用原图，保证图片质量
- ✅ Nginx 图片 API 缓存优化，根据尺寸设置不同缓存时间

### v1.1.0

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
