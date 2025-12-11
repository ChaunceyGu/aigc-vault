# Docker 部署指南

本指南将详细介绍如何使用 Docker 部署 AI 绘图资产归档系统。

## 📋 目录

- [前置要求](#前置要求)
- [部署方式](#部署方式)
  - [方式一：使用 Docker Hub 镜像（推荐）](#方式一使用-docker-hub-镜像推荐)
  - [方式二：本地构建镜像](#方式二本地构建镜像)
- [配置说明](#配置说明)
- [启动和管理](#启动和管理)
- [故障排查](#故障排查)

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- PostgreSQL 15+（可选，可使用 Docker 提供的数据库）
- RustFS/S3 兼容存储服务（如 MinIO）

## 部署方式

`docker-compose.yml` 文件同时支持两种部署方式，你可以根据需要选择：

### 方式一：使用 Docker Hub 镜像（推荐用于生产环境）

如果你已经有构建好的 Docker 镜像，这是最简单的部署方式。

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

# 日志配置
LOG_LEVEL=INFO
```

#### 2. 修改 docker-compose.yml

编辑 `docker-compose.yml`，取消注释 `image` 行，并设置正确的镜像名称：

```yaml
services:
  backend:
    # 取消注释下面这行，并设置你的镜像名称
    image: YOUR_DOCKERHUB_USERNAME/aigc-vault-backend:latest
    # 注释掉 build 部分（如果存在）
    # build:
    #   context: .
    #   dockerfile: Dockerfile.backend

  frontend:
    # 取消注释下面这行，并设置你的镜像名称
    image: YOUR_DOCKERHUB_USERNAME/aigc-vault-frontend:latest
    # 注释掉 build 部分（如果存在）
    # build:
    #   context: .
    #   dockerfile: Dockerfile.frontend
```

**注意**：如果同时设置了 `image` 和 `build`，Docker Compose 会优先使用 `image`（从 Docker Hub 拉取）。

#### 3. 启动服务

```bash
docker-compose up -d
```

#### 4. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

#### 5. 验证部署

- 访问前端：`http://localhost`（或你的服务器 IP）
- 检查后端健康状态：`http://localhost:8000/api/health`
- 查看 API 文档：`http://localhost:8000/docs`

### 方式二：本地构建镜像（推荐用于开发环境）

如果你没有 Docker Hub 镜像，或者想要自定义构建，可以使用本地构建方式。

#### 1. 准备配置文件

创建 `.env` 文件（在项目根目录），配置方式同方式一。

#### 2. 确认 docker-compose.yml 配置

确保 `docker-compose.yml` 中的 `build` 部分已启用（默认已启用），`image` 部分已注释：

```yaml
services:
  backend:
    # image: YOUR_DOCKERHUB_USERNAME/aigc-vault-backend:latest  # 已注释
    build:  # 已启用
      context: .
      dockerfile: Dockerfile.backend

  frontend:
    # image: YOUR_DOCKERHUB_USERNAME/aigc-vault-frontend:latest  # 已注释
    build:  # 已启用
      context: .
      dockerfile: Dockerfile.frontend
```

#### 3. 构建并启动

```bash
docker-compose up -d --build
```

#### 4. 查看构建进度

构建过程可能需要几分钟，你可以通过以下命令查看：

```bash
docker-compose logs -f
```

## 配置说明

### 数据库配置

#### 使用 Docker 提供的数据库（默认）

`docker-compose.yml` 和 `docker-compose.build.yml` 都包含了 PostgreSQL 服务，默认配置：

- 用户名：`postgres`
- 密码：`postgres`
- 数据库名：`aigc_vault`
- 端口：`5432`（映射到主机）

数据库会自动初始化，执行 `migrations/init.sql` 脚本。

#### 使用外部数据库

如果你想使用外部 PostgreSQL 数据库：

1. 删除 `docker-compose.yml` 中的 `postgres` 服务
2. 修改 `DATABASE_URL` 环境变量：

```env
DATABASE_URL=postgresql://用户名:密码@数据库主机:5432/数据库名
```

3. 删除 `backend` 服务的 `depends_on` 中的 `postgres` 依赖

### RustFS/S3 配置

#### 使用 MinIO（推荐用于测试）

1. 启动 MinIO：

```bash
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9900:9900 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9900"
```

2. 访问 MinIO 控制台：`http://localhost:9900`
3. 创建存储桶：`aigcvault`
4. 创建 Access Key 和 Secret Key
5. 在 `.env` 或 `docker-compose.build.yml` 中配置：

```env
RUSTFS_ENDPOINT_URL=http://192.168.1.100:9000
RUSTFS_ACCESS_KEY=你的AccessKey
RUSTFS_SECRET_KEY=你的SecretKey
RUSTFS_BUCKET=aigcvault
RUSTFS_REGION=us-east-1
RUSTFS_USE_SSL=false
```

**注意**：如果 MinIO 运行在 Docker 容器中，需要使用 Docker 网络 IP 或容器名称。

#### 使用其他 S3 兼容服务

配置方式类似，只需修改 `RUSTFS_ENDPOINT_URL` 和相应的认证信息。

### 端口配置

默认端口映射：

- 前端：`80:80`（HTTP）
- 后端：`8000:8000`（API）
- 数据库：`5432:5432`（PostgreSQL）

如需修改，编辑 `docker-compose.yml` 中的 `ports` 配置。

### 网络配置

所有服务默认使用 `aigc-network` 网络，服务之间可以通过服务名互相访问：

- 后端访问数据库：`postgres:5432`
- 前端访问后端：`backend:8000`

## 启动和管理

### 启动服务

```bash
# 使用镜像部署（如果配置了 image）
docker-compose up -d

# 本地构建部署（如果配置了 build）
docker-compose up -d --build
```

### 停止服务

```bash
docker-compose down
```

### 重启服务

```bash
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 查看服务状态

```bash
docker-compose ps
```

### 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# 最近 100 行
docker-compose logs --tail=100 backend
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend bash

# 进入数据库容器
docker-compose exec postgres psql -U postgres -d aigc_vault
```

### 更新镜像

```bash
# 拉取最新镜像
docker-compose pull

# 重启服务
docker-compose up -d
```

### 数据备份

#### 备份数据库

```bash
docker-compose exec postgres pg_dump -U postgres aigc_vault > backup.sql
```

#### 恢复数据库

```bash
docker-compose exec -T postgres psql -U postgres aigc_vault < backup.sql
```

#### 备份数据卷

```bash
# 备份 postgres_data 卷
docker run --rm -v aigcvault_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

## 故障排查

### 服务无法启动

1. **检查端口占用**：

```bash
# Windows
netstat -ano | findstr :80
netstat -ano | findstr :8000

# Linux/Mac
lsof -i :80
lsof -i :8000
```

2. **查看详细日志**：

```bash
docker-compose logs backend
docker-compose logs frontend
```

### 数据库连接失败

1. **检查数据库服务是否运行**：

```bash
docker-compose ps postgres
```

2. **检查数据库健康状态**：

```bash
docker-compose exec postgres pg_isready -U postgres
```

3. **验证连接字符串**：

确保 `DATABASE_URL` 格式正确，如果使用 Docker 提供的数据库，主机名应为 `postgres`。

### RustFS/S3 连接失败

1. **检查 RustFS 服务是否可访问**：

```bash
# 从后端容器内测试
docker-compose exec backend curl http://RUSTFS_HOST:PORT
```

2. **验证认证信息**：

确保 `RUSTFS_ACCESS_KEY` 和 `RUSTFS_SECRET_KEY` 正确。

3. **检查存储桶是否存在**：

确保存储桶 `RUSTFS_BUCKET` 已创建。

### 前端无法访问后端 API

1. **检查 Nginx 配置**：

前端容器使用 Nginx 代理后端请求，确保 `BACKEND_HOST` 和 `BACKEND_PORT` 环境变量正确。

2. **检查网络连接**：

```bash
# 从前端容器测试后端连接
docker-compose exec frontend wget -O- http://backend:8000/api/health
```

3. **查看 Nginx 日志**：

```bash
docker-compose exec frontend cat /var/log/nginx/error.log
```

### 健康检查失败

访问 `http://localhost:8000/api/health` 查看详细健康状态：

```json
{
  "status": "healthy",
  "database": "connected",
  "rustfs": "connected",
  "timestamp": "2025-01-01T00:00:00"
}
```

如果状态不是 `healthy`，检查相应的服务连接。

### 常见错误

#### 错误：`no such file or directory`

- 确保 Dockerfile 中的路径正确
- 确保构建上下文包含所有必要文件

#### 错误：`connection refused`

- 检查服务依赖关系（`depends_on`）
- 确保服务已完全启动

#### 错误：`permission denied`

- 检查文件权限
- 确保 Docker 有权限访问所需文件

## 生产环境建议

1. **使用 HTTPS**：配置反向代理（如 Nginx）启用 HTTPS
2. **修改默认密码**：更改数据库和存储服务的默认密码
3. **限制端口访问**：使用防火墙限制数据库端口的外部访问
4. **定期备份**：设置自动备份数据库和数据卷
5. **监控和日志**：配置日志收集和监控系统
6. **资源限制**：为容器设置 CPU 和内存限制

## 性能优化

1. **数据库优化**：
   - 定期执行 `VACUUM` 和 `ANALYZE`
   - 根据数据量调整 PostgreSQL 配置

2. **存储优化**：
   - 使用 CDN 加速图片访问
   - 配置适当的缓存策略

3. **容器优化**：
   - 使用多阶段构建减小镜像大小
   - 配置适当的健康检查间隔

## 支持

如遇到问题，请：

1. 查看日志文件
2. 检查健康状态端点
3. 提交 Issue 并附上错误日志

