# AI 绘图资产归档系统 (AIGC Asset Vault)

一个基于 PostgreSQL + RustFS 的存算分离架构系统，用于管理和归档 AI 绘图资产、提示词和生成参数。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## 📖 目录

- [功能特性](#-功能特性)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [文档导航](#-文档导航)
- [项目结构](#-项目结构)
- [版本发布](#-版本发布)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

## ✨ 功能特性

### 核心功能
- 📝 **生成记录管理**：支持 txt2img（文生图）和 img2img（图生图）两种模式
- 🏷️ **智能标签系统**：工具标签和模型标签，自动补全和最近使用
- 🔍 **智能搜索**：标题模糊搜索、标签筛选、类型筛选，搜索防抖优化
- 🖼️ **图片管理**：自动生成缩略图，多图片上传，批量下载（ZIP）
- 📦 **输出组管理**：支持为每条记录创建多个输出组，每个组可独立设置工具、模型和图片
- 🎨 **视图切换**：网格视图和瀑布流视图，瀑布流随机展示图片

### 用户系统
- 👤 **用户账号系统**：注册、登录、JWT 认证
- ⭐ **个人收藏**：收藏喜欢的记录，支持收藏列表查看
- 🔐 **RBAC 权限管理**：完整的角色权限控制系统，支持动态角色和权限分配
- 🛡️ **管理员后台**：用户管理、角色权限管理、统计信息查看

### 安全与优化
- 🚫 **NSFW 内容管理**：标记敏感内容，自动打码保护，统一灯箱预览
- 🔐 **验证码系统**：登录和注册都使用多难度数学验证码，防止暴力破解
- 🌐 **外网访问支持**：通过 API 代理实现文件访问，无需暴露内部端口
- ⚡ **性能优化**：图片懒加载、防抖搜索、智能缓存、API 响应缓存
- 🖼️ **图片优化**：前端自动压缩、后端多尺寸支持、智能缓存策略
- 📱 **移动端优化**：响应式布局、触摸交互优化、移动端专用 UI 适配

### 开发与部署
- 🔄 **CI/CD 集成**：GitHub Actions 自动构建和推送 Docker 镜像
- 🔐 **安全扫描**：集成 Trivy 进行容器漏洞扫描

## 🛠️ 技术栈

- **前端**：React 18 + TypeScript + Vite + Ant Design
- **后端**：FastAPI + Python 3.12+
- **数据库**：PostgreSQL 15+（支持数组和 GIN 索引）
- **文件存储**：RustFS（S3 兼容存储）
- **部署**：Docker + Docker Compose + Nginx

## 🚀 快速开始

### 前置要求

- **Python**：3.12+
- **Node.js**：18+
- **PostgreSQL**：15+（支持数组和 GIN 索引）
- **RustFS/S3**：S3 兼容存储服务（或使用 MinIO）
- **Docker**（可选）：用于 Docker 部署

### 方式一：Docker 部署（推荐）

1. **克隆项目**
```bash
git clone https://github.com/ChaunceyGu/aigc-vault.git
cd aigc-vault
```

2. **配置环境变量**
```bash
cp env.example .env
# 编辑 .env 文件，配置数据库和存储服务
```

3. **启动服务**
```bash
docker-compose up -d
```

4. **访问系统**
- 前端：`http://localhost`
- API 文档：`http://localhost/docs`

**默认管理员账号**：
- 用户名：`admin`
- 密码：`admin123456`
- ⚠️ **首次登录后请立即修改密码！**

详细部署说明请参考 [安装部署文档](./docs/INSTALLATION.md)。

### 方式二：本地开发

1. **克隆项目**
```bash
git clone https://github.com/ChaunceyGu/aigc-vault.git
cd aigc-vault
```

2. **设置开发环境**
```bash
./setup.sh
```

3. **配置环境变量**
```bash
cp env.example .env
# 编辑 .env 文件
```

4. **初始化数据库**
```bash
cd backend
source venv/bin/activate
python scripts/init_db.py
```

5. **启动服务**
```bash
# 启动所有服务
./启动所有服务.sh

# 或分别启动
cd backend && ./start.sh        # 后端：http://localhost:8000
cd frontend && npm run dev      # 前端：http://localhost:5173
```

详细开发指南请参考 [开发文档](./docs/DEVELOPMENT.md)。

## 📚 文档导航

| 文档 | 说明 |
|------|------|
| [安装部署](./docs/INSTALLATION.md) | 详细的安装和部署指南（Docker、本地开发） |
| [配置说明](./docs/CONFIGURATION.md) | 环境变量、数据库、存储服务配置 |
| [开发指南](./docs/DEVELOPMENT.md) | 开发环境设置、代码结构、调试技巧 |
| [API 文档](./docs/API.md) | 完整的 API 接口文档 |
| [安全说明](./docs/SECURITY.md) | 安全配置、权限管理、NSFW 内容管理 |
| [性能优化](./docs/PERFORMANCE.md) | 性能优化策略和最佳实践 |
| [更新日志](./docs/CHANGELOG.md) | 版本更新历史 |

## 📁 项目结构

```
.
├── frontend/              # React 前端应用
│   ├── src/
│   │   ├── components/   # React 组件
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # API 服务
│   │   ├── contexts/     # React Context
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
├── migrations/           # 数据库迁移脚本
├── scripts/              # 项目脚本
│   └── backup_db.sh     # 数据库备份脚本
├── docs/                 # 文档目录
├── docker-compose.yml    # Docker Compose 配置
├── Dockerfile.api        # API 服务 Dockerfile
├── Dockerfile.web        # Web 服务 Dockerfile
├── env.example           # 环境变量示例
└── nginx.conf.template   # Nginx 配置模板
```

## 🏷️ 版本发布

项目使用语义化版本（Semantic Versioning），版本号格式：`v主版本号.次版本号.修订号`（如 `v1.3.0`）。

### 发布新版本

使用项目提供的发布脚本：

```bash
./aigc-push-local.sh
```

脚本功能：
- 自动从 README.md 读取当前版本
- 支持版本号递增（Patch/Minor/Major）
- 自动生成 Git 标签
- 推送到 GitHub 并触发 CI/CD

**注意**：如果标签已存在，脚本会提示自动递增版本号，避免构建失败。

详细说明请参考 [开发文档 - 版本发布](./docs/DEVELOPMENT.md#版本发布)。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

- 项目地址：[https://github.com/ChaunceyGu/aigc-vault](https://github.com/ChaunceyGu/aigc-vault)
- 问题反馈：[Issues](https://github.com/ChaunceyGu/aigc-vault/issues)
- Pull Request：[Pull Requests](https://github.com/ChaunceyGu/aigc-vault/pulls)

### 贡献流程

1. Fork 项目
2. 创建特性分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 开启 Pull Request

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 许可证。

---

**快速链接**：
- 📖 [完整文档](./docs/)
- 🐳 [Docker 部署](./docs/INSTALLATION.md#docker-部署)
- 💻 [开发指南](./docs/DEVELOPMENT.md)
- 🔒 [安全配置](./docs/SECURITY.md)
- 📊 [更新日志](./docs/CHANGELOG.md)
