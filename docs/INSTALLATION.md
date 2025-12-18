# 安装部署指南

本文档提供详细的安装和部署说明。

## 目录

- [Docker 部署](#docker-部署)
- [本地开发环境](#本地开发环境)
- [数据库初始化](#数据库初始化)
- [验证部署](#验证部署)
- [故障排查](#故障排查)

## Docker 部署

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- PostgreSQL 15+（可选，可使用 Docker 提供的数据库）
- RustFS/S3 兼容存储服务（如 MinIO）

### 快速部署

#### 1. 准备配置文件

创建 `.env` 文件（在项目根目录）：

```bash
cp env.example .env
```

编辑 `.env` 文件，配置以下内容：

```env
# 数据库配置（Docker 部署使用服务名）
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

# JWT 认证配置
JWT_SECRET_KEY=your-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# 默认管理员账号配置（首次部署时自动创建）
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123456
DEFAULT_ADMIN_EMAIL=

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

**首次部署时，系统会自动创建默认管理员账号：**
- 默认用户名：`admin`（可通过 `DEFAULT_ADMIN_USERNAME` 环境变量修改）
- 默认密码：`admin123456`（可通过 `DEFAULT_ADMIN_PASSWORD` 环境变量修改）
- ⚠️ **首次登录后请立即修改密码！**

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

### 安全配置

**默认配置（推荐用于生产环境）：**
- ✅ 数据库端口不暴露到主机，仅在 Docker 内部网络可访问
- ✅ 后端 API 端口（8000）不暴露到主机，仅通过 Nginx 代理访问
- ✅ 仅暴露 Web 端口（80），所有请求通过 Nginx 代理
- ✅ 文件访问通过 API 代理，无需暴露 RustFS 端口

**如果需要从外部访问数据库：**
- 编辑 `docker-compose.yml`，取消 `postgres` 服务的 `ports` 注释
- 注意：暴露数据库端口会带来安全风险，建议仅在开发环境使用

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

## 本地开发环境

### 前置要求

- **Python**：3.12+
- **Node.js**：18+
- **PostgreSQL**：15+（支持数组和 GIN 索引）
- **RustFS/S3**：S3 兼容存储服务（或使用 MinIO）

### 设置步骤

#### 1. 克隆项目

```bash
git clone https://github.com/ChaunceyGu/aigc-vault.git
cd aigc-vault
```

#### 2. 配置环境变量

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

# JWT 认证配置
JWT_SECRET_KEY=your-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# 默认管理员账号配置
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123456
DEFAULT_ADMIN_EMAIL=

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

**首次部署时，系统会自动创建默认管理员账号。**

你也可以手动运行初始化脚本创建管理员：

```bash
cd backend
source venv/bin/activate
python scripts/init_admin.py
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

## 数据库初始化

数据库初始化脚本位于 `migrations/init.sql`，首次部署时会自动执行。

### 数据库迁移

项目包含以下迁移脚本：

- `migrations/init.sql` - 基础表结构
- `migrations/add_output_groups.sql` - 输出组功能
- `migrations/add_user_system.sql` - 用户账号系统
- `migrations/add_rbac_system.sql` - RBAC 权限系统

### 手动执行迁移

如果需要手动执行迁移：

```bash
cd backend
source venv/bin/activate
python scripts/apply_migration.py migrations/your_migration.sql
```

## 验证部署

### 健康检查

```bash
# 检查后端健康状态
curl http://localhost/api/health

# 或通过浏览器访问
# http://localhost/api/health
```

### 功能测试

1. **访问前端**：`http://localhost`（Docker）或 `http://localhost:5173`（本地开发）
2. **登录系统**：使用默认管理员账号登录
3. **创建记录**：测试创建一条生成记录
4. **上传图片**：测试图片上传功能
5. **查看详情**：测试详情页显示

### API 文档

启动后端服务后，访问以下地址查看 API 文档：

- **Swagger UI**: `http://localhost:8000/docs`（本地开发）或 `http://localhost/docs`（Docker）
- **ReDoc**: `http://localhost:8000/redoc`（本地开发）或 `http://localhost/redoc`（Docker）

## 故障排查

### 常见问题

#### 1. 数据库连接失败

**症状**：后端启动失败，提示数据库连接错误

**解决方案**：
- 检查 PostgreSQL 是否运行：`pg_isready` 或 `docker-compose ps postgres`
- 检查 `DATABASE_URL` 配置是否正确
- 检查数据库用户权限
- 检查防火墙设置

#### 2. RustFS/S3 连接失败

**症状**：上传文件失败，提示存储服务连接错误

**解决方案**：
- 检查 RustFS/S3 服务是否运行
- 检查 `RUSTFS_ENDPOINT_URL` 配置是否正确
- 检查 Access Key 和 Secret Key 是否正确
- 检查存储桶是否存在

#### 3. 前端无法访问后端 API

**症状**：前端页面显示网络错误

**解决方案**：
- 检查后端服务是否运行
- 检查 CORS 配置是否正确
- 检查 Nginx 代理配置（Docker 部署）
- 检查浏览器控制台错误信息

#### 4. 默认管理员账号无法登录

**症状**：使用默认账号登录失败

**解决方案**：
- 检查数据库是否已初始化
- 检查环境变量 `DEFAULT_ADMIN_USERNAME` 和 `DEFAULT_ADMIN_PASSWORD` 是否正确
- 手动运行初始化脚本：`python scripts/init_admin.py`
- 检查数据库中的用户表是否有管理员账号

#### 5. Docker 容器无法启动

**症状**：`docker-compose up` 失败

**解决方案**：
- 检查 Docker 和 Docker Compose 版本
- 检查端口是否被占用：`netstat -tulpn | grep :80`
- 检查 `.env` 文件是否存在且配置正确
- 查看详细错误日志：`docker-compose logs`

### 日志查看

**Docker 部署**：
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f api
docker-compose logs -f web
```

**本地开发**：
- 后端日志：查看终端输出
- 前端日志：查看浏览器控制台和终端输出

### 数据库备份与恢复

**备份**：
```bash
./scripts/backup_db.sh
```

**恢复**：
```bash
# 使用 pg_restore 或 psql 恢复备份
psql -U postgres -d aigc_vault < backup.sql
```

### 获取帮助

如果遇到问题，可以：

1. 查看 [GitHub Issues](https://github.com/ChaunceyGu/aigc-vault/issues)
2. 提交新的 Issue
3. 查看 [开发文档](./DEVELOPMENT.md) 获取更多信息

