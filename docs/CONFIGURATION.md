# 配置说明

本文档详细说明系统的配置选项。

## 目录

- [环境变量](#环境变量)
- [数据库配置](#数据库配置)
- [存储服务配置](#存储服务配置)
- [JWT 认证配置](#jwt-认证配置)
- [CORS 配置](#cors-配置)
- [日志配置](#日志配置)

## 环境变量

所有配置通过环境变量进行，可以通过 `.env` 文件或系统环境变量设置。

### 完整配置列表

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | - | ✅ |
| `RUSTFS_ENDPOINT_URL` | S3 兼容存储服务地址 | - | ✅ |
| `RUSTFS_ACCESS_KEY` | S3 Access Key | - | ✅ |
| `RUSTFS_SECRET_KEY` | S3 Secret Key | - | ✅ |
| `RUSTFS_BUCKET` | 存储桶名称 | `aigcvault` | ✅ |
| `RUSTFS_REGION` | 区域 | `us-east-1` | - |
| `RUSTFS_USE_SSL` | 是否使用 SSL | `false` | - |
| `CORS_ORIGINS` | 允许的 CORS 源（逗号分隔） | - | ✅ |
| `JWT_SECRET_KEY` | JWT 密钥 | - | ✅ |
| `JWT_ALGORITHM` | JWT 算法 | `HS256` | - |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Token 过期时间（分钟） | `1440` | - |
| `DEFAULT_ADMIN_USERNAME` | 默认管理员用户名 | `admin` | - |
| `DEFAULT_ADMIN_PASSWORD` | 默认管理员密码 | `admin123456` | - |
| `DEFAULT_ADMIN_EMAIL` | 默认管理员邮箱 | - | - |
| `LOG_LEVEL` | 日志级别 | `INFO` | - |

## 数据库配置

### 连接字符串格式

```
postgresql://用户名:密码@主机:端口/数据库名
```

### 配置示例

**本地开发**：
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aigc_vault
```

**Docker 部署**（使用 Docker Compose 中的 postgres 服务）：
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/aigc_vault
```

**外部数据库**：
```env
DATABASE_URL=postgresql://user:password@db.example.com:5432/aigc_vault
```

### 数据库要求

- PostgreSQL 15+
- 支持数组类型（`ARRAY`）
- 支持 GIN 索引（用于数组查询优化）

### 安全建议

- 使用强密码
- 限制数据库访问 IP（如果使用外部数据库）
- Docker 部署时默认不暴露数据库端口，仅在内部网络可访问

## 存储服务配置

系统支持任何 S3 兼容的存储服务，包括：

- RustFS
- MinIO
- AWS S3
- 阿里云 OSS（S3 兼容模式）
- 腾讯云 COS（S3 兼容模式）

### 配置示例

**MinIO（本地测试）**：
```env
RUSTFS_ENDPOINT_URL=http://localhost:9900
RUSTFS_ACCESS_KEY=minioadmin
RUSTFS_SECRET_KEY=minioadmin
RUSTFS_BUCKET=aigcvault
RUSTFS_REGION=us-east-1
RUSTFS_USE_SSL=false
```

**RustFS（生产环境）**：
```env
RUSTFS_ENDPOINT_URL=http://192.168.1.100:9900
RUSTFS_ACCESS_KEY=your_access_key
RUSTFS_SECRET_KEY=your_secret_key
RUSTFS_BUCKET=aigcvault
RUSTFS_REGION=us-east-1
RUSTFS_USE_SSL=false
```

**AWS S3**：
```env
RUSTFS_ENDPOINT_URL=https://s3.amazonaws.com
RUSTFS_ACCESS_KEY=your_aws_access_key
RUSTFS_SECRET_KEY=your_aws_secret_key
RUSTFS_BUCKET=your-bucket-name
RUSTFS_REGION=us-east-1
RUSTFS_USE_SSL=true
```

### 存储桶准备

在配置存储服务之前，需要：

1. 创建存储桶（Bucket）
2. 创建 Access Key 和 Secret Key
3. 确保存储桶有读写权限

### 安全建议

- 使用强密码的 Access Key 和 Secret Key
- 限制 Access Key 的权限范围（最小权限原则）
- 生产环境建议使用 HTTPS（`RUSTFS_USE_SSL=true`）

## JWT 认证配置

### JWT 密钥生成

**使用 OpenSSL**：
```bash
openssl rand -hex 32
```

**使用 Python**：
```python
import secrets
print(secrets.token_hex(32))
```

### 配置示例

```env
# JWT 密钥（生产环境请务必修改为强随机字符串）
JWT_SECRET_KEY=your-secret-key-change-this-in-production

# JWT 算法（通常使用 HS256）
JWT_ALGORITHM=HS256

# Token 过期时间（分钟），默认 24 小时
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### 安全建议

- ⚠️ **生产环境必须修改 `JWT_SECRET_KEY`**
- 使用强随机字符串（至少 32 字符）
- 定期轮换密钥（需要用户重新登录）
- 根据安全需求调整 Token 过期时间

## CORS 配置

CORS（跨域资源共享）配置控制哪些域名可以访问后端 API。

### 配置示例

**本地开发**（多个地址用逗号分隔）：
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

**生产环境**：
```env
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**允许所有来源**（不推荐，仅用于开发）：
```env
CORS_ORIGINS=*
```

### 安全建议

- 生产环境只允许特定域名
- 不要使用通配符 `*`（除非是开发环境）
- 包含所有可能的访问地址（带/不带 www，HTTP/HTTPS）

## 日志配置

### 日志级别

可选值（从低到高）：
- `DEBUG`：详细调试信息
- `INFO`：一般信息（默认）
- `WARNING`：警告信息
- `ERROR`：错误信息
- `CRITICAL`：严重错误

### 配置示例

```env
# 开发环境使用 DEBUG，生产环境使用 INFO
LOG_LEVEL=INFO
```

### 日志输出

- **Docker 部署**：日志输出到容器标准输出，可通过 `docker-compose logs` 查看
- **本地开发**：日志输出到终端

## 默认管理员配置

首次部署时，系统会自动创建默认管理员账号。

### 配置示例

```env
# 默认管理员用户名
DEFAULT_ADMIN_USERNAME=admin

# 默认管理员密码（首次登录后请立即修改）
DEFAULT_ADMIN_PASSWORD=admin123456

# 默认管理员邮箱（可选）
DEFAULT_ADMIN_EMAIL=admin@example.com
```

### 安全建议

- ⚠️ **首次登录后请立即修改密码！**
- 使用强密码
- 如果未设置环境变量，系统使用默认值（`admin` / `admin123456`）

## 配置验证

### 验证数据库连接

```bash
cd backend
source venv/bin/activate
python scripts/verify_db.py
```

### 验证存储服务连接

```bash
cd backend
source venv/bin/activate
python scripts/verify_rustfs.py
```

### 验证配置完整性

启动后端服务时，系统会检查必需的环境变量，如果缺失会显示错误信息。

## 配置最佳实践

1. **使用 `.env` 文件**：将配置保存在 `.env` 文件中，不要提交到 Git
2. **环境分离**：开发、测试、生产环境使用不同的配置
3. **密钥管理**：生产环境使用密钥管理服务（如 AWS Secrets Manager）
4. **定期审查**：定期审查和更新配置
5. **文档记录**：记录所有自定义配置

## 相关文档

- [安装部署](./INSTALLATION.md)
- [安全说明](./SECURITY.md)
- [开发指南](./DEVELOPMENT.md)

