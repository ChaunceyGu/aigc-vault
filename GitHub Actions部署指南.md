# GitHub Actions 自动构建和推送镜像

无需在本地安装 Docker！使用 GitHub Actions 自动构建并推送到 Docker Hub。

---

## 🎯 优势

- ✅ **无需本地 Docker**：完全在云端构建
- ✅ **自动化**：代码推送后自动构建
- ✅ **免费使用**：GitHub Actions 免费额度足够
- ✅ **多架构支持**：可构建 ARM/x86 等多种架构
- ✅ **缓存加速**：使用构建缓存，构建更快

---

## 📋 设置步骤

### 步骤 1: 准备 GitHub 仓库

1. 在 GitHub 创建新仓库（如果还没有）
2. 将代码推送到 GitHub：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/aigc-vault.git
   git push -u origin main
   ```

### 步骤 2: 配置 Docker Hub Secrets

1. **登录 GitHub**，进入你的仓库
2. **点击 Settings** → **Secrets and variables** → **Actions**
3. **点击 New repository secret**，添加以下两个密钥：

   **Secret 1:**
   - Name: `DOCKER_USERNAME`
   - Value: 你的 Docker Hub 用户名

   **Secret 2:**
   - Name: `DOCKER_PASSWORD`
   - Value: 你的 Docker Hub 密码或访问令牌（推荐使用 Access Token）

   > 💡 **获取 Docker Hub Access Token**：
   > - 登录 Docker Hub
   > - 点击右上角头像 → **Account Settings**
   > - 左侧菜单选择 **Security** → **New Access Token**
   > - 创建令牌并复制（只显示一次）

### 步骤 3: 推送工作流文件

工作流文件 `.github/workflows/build-and-push.yml` 已经创建好了，直接提交即可：

```bash
git add .github/workflows/build-and-push.yml
git commit -m "Add GitHub Actions workflow"
git push
```

### 步骤 4: 查看构建结果

1. 在 GitHub 仓库页面，点击 **Actions** 标签
2. 可以看到构建进度和结果
3. 构建完成后，镜像会自动推送到 Docker Hub

---

## 🚀 使用方法

### 自动触发

工作流会在以下情况自动触发：
- ✅ 推送到 `main` 或 `master` 分支
- ✅ 创建版本标签（如 `v1.0.0`）
- ✅ 手动触发（在 Actions 页面点击 "Run workflow"）

### 手动触发

1. 进入 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择 **Build and Push Docker Images**
4. 点击 **Run workflow**
5. 选择分支，点击绿色按钮

### 使用版本标签

创建版本标签来推送特定版本：

```bash
# 创建标签
git tag v1.0.0
git push origin v1.0.0

# 这样会构建并推送以下标签：
# - YOUR_USERNAME/aigc-vault-backend:v1.0.0
# - YOUR_USERNAME/aigc-vault-backend:1.0.0
# - YOUR_USERNAME/aigc-vault-backend:1.0
# - YOUR_USERNAME/aigc-vault-backend:latest
```

---

## 📝 修改 Docker Hub 用户名

编辑 `.github/workflows/build-and-push.yml` 文件，**不需要修改**，因为使用的是 Secrets。

只需要在 GitHub 仓库的 Settings 中设置 `DOCKER_USERNAME` Secret 即可。

---

## 🔧 在 NAS 上使用

构建完成后，在绿联 NAS 上：

1. **修改 docker-compose.yml**：
   ```yaml
   services:
     backend:
       image: YOUR_DOCKERHUB_USERNAME/aigc-vault-backend:latest
     frontend:
       image: YOUR_DOCKERHUB_USERNAME/aigc-vault-frontend:latest
   ```

2. **上传 docker-compose.yml 到 NAS**

3. **启动服务**：
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

---

## 🔄 更新流程

以后更新代码和镜像的流程：

1. **修改代码**
2. **提交并推送**：
   ```bash
   git add .
   git commit -m "更新功能"
   git push
   ```
3. **GitHub Actions 自动构建**
4. **在 NAS 上拉取新镜像**：
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

---

## 📊 查看构建日志

1. 进入 GitHub 仓库
2. 点击 **Actions** 标签
3. 点击某个构建任务
4. 查看详细日志

如果构建失败，日志会显示具体错误信息。

---

## ⚙️ 自定义构建

### 只在特定分支构建

编辑 `.github/workflows/build-and-push.yml`：

```yaml
on:
  push:
    branches:
      - main  # 只构建 main 分支
      # - develop  # 取消注释以包含其他分支
```

### 添加构建条件

```yaml
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'  # 只在 main 分支构建
```

### 多架构构建（ARM/x86）

如果需要支持 ARM 架构（如树莓派），可以添加多平台构建：

```yaml
- name: Build and push backend image
  uses: docker/build-push-action@v5
  with:
    context: .
    file: ./Dockerfile.backend
    platforms: linux/amd64,linux/arm64  # 添加 ARM 支持
    push: true
    tags: ${{ steps.meta-backend.outputs.tags }}
```

---

## 💡 常见问题

### Q: 构建失败怎么办？

**A:** 查看 GitHub Actions 日志：
1. 进入 Actions 页面
2. 点击失败的构建
3. 查看错误信息

常见原因：
- Docker Hub 用户名或密码错误
- 代码有语法错误
- Dockerfile 路径不正确

### Q: 如何查看镜像是否推送成功？

**A:** 
1. 登录 Docker Hub
2. 进入你的账号
3. 查看仓库列表，应该能看到 `aigc-vault-backend` 和 `aigc-vault-frontend`

### Q: 构建太慢怎么办？

**A:** 
- 首次构建会比较慢，后续会使用缓存
- 工作流已经配置了构建缓存
- 可以在 Docker Hub 查看镜像大小，确保没有不必要的文件

### Q: 如何回退到旧版本？

**A:** 
1. 在 Docker Hub 查看镜像的标签历史
2. 修改 `docker-compose.yml` 使用特定标签：
   ```yaml
   image: YOUR_USERNAME/aigc-vault-backend:v1.0.0
   ```

### Q: GitHub Actions 免费额度够用吗？

**A:** 
- GitHub 免费账户每月有 2000 分钟构建时间
- 每次构建约 5-10 分钟
- 每月可构建 200-400 次，完全够用

---

## ✅ 完成清单

- [ ] 创建 GitHub 仓库
- [ ] 推送代码到 GitHub
- [ ] 配置 Docker Hub Secrets（USERNAME 和 PASSWORD）
- [ ] 推送 `.github/workflows/build-and-push.yml` 文件
- [ ] 查看 Actions 构建结果
- [ ] 确认镜像已推送到 Docker Hub
- [ ] 修改 docker-compose.yml 使用你的镜像
- [ ] 在 NAS 上测试部署

---

**设置完成后，你只需要 `git push`，GitHub 就会自动构建并推送镜像！** 🎉

