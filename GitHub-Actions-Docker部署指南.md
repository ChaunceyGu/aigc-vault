# GitHub Actions 自动构建 Docker 镜像指南

本指南将详细介绍如何配置 GitHub Actions，实现代码推送到 GitHub 后自动构建 Docker 镜像并推送到 Docker Hub。

## 📋 目录

- [前置准备](#前置准备)
- [步骤一：创建 GitHub 仓库](#步骤一创建-github-仓库)
- [步骤二：配置 Docker Hub](#步骤二配置-docker-hub)
- [步骤三：配置 GitHub Secrets](#步骤三配置-github-secrets)
- [步骤四：创建 GitHub Actions 工作流](#步骤四创建-github-actions-工作流)
- [步骤五：推送代码并验证](#步骤五推送代码并验证)
- [故障排查](#故障排查)

## 前置准备

- GitHub 账号
- Docker Hub 账号
- 本地已安装 Git

## 步骤一：创建 GitHub 仓库

### 1. 在 GitHub 上创建新仓库

1. 登录 GitHub，点击右上角的 `+` 按钮，选择 `New repository`
2. 填写仓库信息：
   - **Repository name**: `aigc-vault`（或你喜欢的名称）
   - **Description**: `AI 绘图资产归档系统`
   - **Visibility**: 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"（因为本地已有代码）
3. 点击 `Create repository`

### 2. 初始化本地 Git 仓库并推送

在项目根目录执行以下命令：

```bash
# 初始化 Git 仓库
git init

# 添加 .gitignore 文件（如果还没有）
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
*.egg-info/
dist/
build/

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
dist/
.DS_Store

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# 环境变量
.env
.env.local
.env.*.local

# 日志
*.log
logs/
backend_output.log
frontend_output.log

# 数据库
*.db
*.sqlite

# Docker
.dockerignore

# 其他
.DS_Store
Thumbs.db
EOF

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: AI 绘图资产归档系统"

# 添加远程仓库（替换为你的 GitHub 用户名和仓库名）
git remote add origin https://github.com/你的用户名/aigc-vault.git

# 推送代码
git branch -M main
git push -u origin main
```

## 步骤二：配置 Docker Hub

### 1. 创建 Docker Hub 账号（如果还没有）

访问 [Docker Hub](https://hub.docker.com/) 注册账号。

### 2. 创建仓库

1. 登录 Docker Hub
2. 点击右上角头像，选择 `Repositories` → `Create Repository`
3. 创建两个仓库：
   - **Repository 1**:
     - Name: `aigc-vault-api`
     - Visibility: Public 或 Private
     - Description: `AI 绘图资产归档系统 - API 服务`
   
   - **Repository 2**:
     - Name: `aigc-vault-web`
     - Visibility: Public 或 Private
     - Description: `AI 绘图资产归档系统 - Web 服务`

## 步骤三：配置 GitHub Secrets

GitHub Secrets 用于安全存储敏感信息（如 Docker Hub 密码）。

### 1. 进入仓库设置

1. 在 GitHub 仓库页面，点击 `Settings` 标签
2. 左侧菜单选择 `Secrets and variables` → `Actions`

### 2. 添加 Secrets

点击 `New repository secret`，添加以下 Secrets：

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `DOCKER_USERNAME` | Docker Hub 用户名 | `your_dockerhub_username` |
| `DOCKER_PASSWORD` | Docker Hub Access Token 或密码 | 见下方获取方法 |

### 3. 获取 Docker Hub Access Token

1. 登录 Docker Hub
2. 点击右上角头像 → `Account Settings` → `Security` → `New Access Token`
3. 填写 Token 信息：
   - **Description**: `GitHub Actions`
   - **Permissions**: 选择 `Read, Write, Delete`
4. 点击 `Generate`
5. **重要**：复制生成的 Token（只显示一次），这就是 `DOCKER_PASSWORD` 的值

## 步骤四：创建 GitHub Actions 工作流

### 1. 创建工作流目录

在项目根目录创建 `.github/workflows` 目录：

```bash
mkdir -p .github/workflows
```

### 2. 创建 Docker 构建工作流文件

创建 `.github/workflows/docker-build.yml` 文件：

```yaml
name: Build and Push Docker Images

on:
  push:
    branches:
      - main
      - master
    tags:
      - 'v*'
  pull_request:
    branches:
      - main
      - master

env:
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
  API_IMAGE_NAME: aigc-vault-api
  WEB_IMAGE_NAME: aigc-vault-web

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Extract metadata for API
        id: meta-api
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.DOCKER_USERNAME }}/${{ env.API_IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Extract metadata for Web
        id: meta-web
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.DOCKER_USERNAME }}/${{ env.WEB_IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.api
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta-api.outputs.tags }}
          labels: ${{ steps.meta-api.outputs.labels }}
          cache-from: type=registry,ref=${{ env.DOCKER_USERNAME }}/${{ env.API_IMAGE_NAME }}:buildcache
          cache-to: type=registry,ref=${{ env.DOCKER_USERNAME }}/${{ env.API_IMAGE_NAME }}:buildcache,mode=max

      - name: Build and push Web image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.web
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta-web.outputs.tags }}
          labels: ${{ steps.meta-web.outputs.labels }}
          cache-from: type=registry,ref=${{ env.DOCKER_USERNAME }}/${{ env.WEB_IMAGE_NAME }}:buildcache
          cache-to: type=registry,ref=${{ env.DOCKER_USERNAME }}/${{ env.WEB_IMAGE_NAME }}:buildcache,mode=max
```

### 3. 简化版本（如果上面的太复杂）

如果你想要一个更简单的版本，可以使用这个：

```yaml
name: Build and Push Docker Images

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

env:
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.api
          push: true
          tags: |
            ${{ env.DOCKER_USERNAME }}/aigc-vault-api:latest
            ${{ env.DOCKER_USERNAME }}/aigc-vault-api:${{ github.sha }}

      - name: Build and push Web image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.web
          push: true
          tags: |
            ${{ env.DOCKER_USERNAME }}/aigc-vault-web:latest
            ${{ env.DOCKER_USERNAME }}/aigc-vault-web:${{ github.sha }}
```

## 步骤五：推送代码并验证

### 1. 提交工作流文件

```bash
# 添加工作流文件
git add .github/

# 提交
git commit -m "Add GitHub Actions workflow for Docker builds"

# 推送
git push origin main
```

### 2. 查看构建状态

1. 在 GitHub 仓库页面，点击 `Actions` 标签
2. 你应该能看到一个新的工作流运行
3. 点击工作流查看详细构建日志

### 3. 验证 Docker Hub

1. 访问 Docker Hub，进入你的仓库
2. 应该能看到新构建的镜像：
   - `your_username/aigc-vault-api:latest`
   - `your_username/aigc-vault-web:latest`

### 4. 更新 docker-compose.yml

更新 `docker-compose.yml` 中的镜像名称：

```yaml
services:
  api:
    image: 你的DockerHub用户名/aigc-vault-api:latest
    # ... 其他配置

  web:
    image: 你的DockerHub用户名/aigc-vault-web:latest
    # ... 其他配置
```

## 高级配置

### 1. 使用语义化版本（推荐）

工作流已配置为使用语义化版本（Semantic Versioning）。当你创建 Git 标签时，会自动构建并推送带版本号的镜像：

```bash
# 创建语义化版本标签（推荐格式：v主版本号.次版本号.修订号）
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

这会在 Docker Hub 创建以下标签：
- `your_username/aigc-vault-api:v1.0.0` - 完整版本号
- `your_username/aigc-vault-api:v1.0` - 主版本.次版本
- `your_username/aigc-vault-api:v1` - 主版本
- `your_username/aigc-vault-api:latest` - 最新版本（如果推送到 main/master 分支）

**版本号规则**：
- `v1.0.0` - 主版本号.次版本号.修订号
- `v1.0.1` - 修订版本（bug 修复）
- `v1.1.0` - 次版本（新功能，向后兼容）
- `v2.0.0` - 主版本（重大变更，可能不向后兼容）

### 2. 多架构支持（可选）

如果需要支持 ARM64 等架构，可以在工作流中添加：

```yaml
- name: Build and push API image
  uses: docker/build-push-action@v5
  with:
    context: .
    file: ./Dockerfile.api
    push: true
    platforms: linux/amd64,linux/arm64
    tags: ${{ env.DOCKER_USERNAME }}/aigc-vault-api:latest
```

### 3. 构建缓存优化

工作流中已经包含了构建缓存配置，可以加速后续构建。

## 故障排查

### 问题 1: 构建失败 - "unauthorized"

**原因**: Docker Hub 认证失败

**解决方案**:
1. 检查 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD` 是否正确设置
2. 确认 Docker Hub Token 有 `Read, Write, Delete` 权限
3. 重新生成 Token 并更新 Secret

### 问题 2: 构建失败 - "file not found"

**原因**: Dockerfile 路径错误

**解决方案**:
1. 确认 `Dockerfile.api` 和 `Dockerfile.web` 在项目根目录
2. 检查工作流中的 `file` 路径是否正确

### 问题 3: 推送失败 - "repository does not exist"

**原因**: Docker Hub 仓库不存在

**解决方案**:
1. 在 Docker Hub 创建对应的仓库
2. 确认仓库名称与工作流中的名称一致

### 问题 4: 构建超时

**原因**: 构建时间过长

**解决方案**:
1. 优化 Dockerfile，减少构建层数
2. 使用多阶段构建
3. 增加构建缓存

### 问题 5: 查看详细日志

在 GitHub Actions 页面：
1. 点击失败的工作流
2. 点击失败的 Job
3. 展开失败的 Step 查看详细错误信息

## 常用命令

### 手动触发构建

```bash
# 创建空提交触发构建
git commit --allow-empty -m "Trigger Docker build"
git push origin main
```

### 查看本地构建（测试）

```bash
# 构建 API 镜像
docker build -f Dockerfile.api -t aigc-vault-api:test .

# 构建 Web 镜像
docker build -f Dockerfile.web -t aigc-vault-web:test .
```

### 测试推送

```bash
# 登录 Docker Hub
docker login

# 标记镜像
docker tag aigc-vault-api:test your_username/aigc-vault-api:test

# 推送
docker push your_username/aigc-vault-api:test
```

## 最佳实践

1. **使用版本标签**: 为重要版本创建 Git 标签，自动构建版本镜像
2. **定期更新基础镜像**: 定期更新 Dockerfile 中的基础镜像
3. **优化 Dockerfile**: 使用多阶段构建，减少镜像大小
4. **使用构建缓存**: 工作流已配置缓存，可以加速构建
5. **监控构建**: 定期检查 GitHub Actions 构建状态
6. **安全扫描**: 考虑添加安全扫描步骤（如 Trivy）

## 下一步

配置完成后，每次推送代码到 `main` 分支时，GitHub Actions 会自动：
1. 构建 Docker 镜像
2. 推送到 Docker Hub
3. 更新 `latest` 标签

你现在可以在任何地方使用这些镜像：

```bash
docker pull your_username/aigc-vault-api:latest
docker pull your_username/aigc-vault-web:latest
```

或者更新 `docker-compose.yml` 使用你的镜像。

