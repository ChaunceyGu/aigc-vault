# 🚀 使用 GitHub Actions 部署（无需本地 Docker）

不想在 Windows 上安装 Docker？使用 GitHub Actions 自动构建并推送到 Docker Hub！

---

## ⚡ 快速开始（3 步）

### 1️⃣ 推送代码到 GitHub

```bash
# 如果没有 Git 仓库，先初始化
git init
git add .
git commit -m "Initial commit"

# 添加 GitHub 远程仓库
git remote add origin https://github.com/YOUR_USERNAME/aigc-vault.git
git push -u origin main
```

### 2️⃣ 配置 Docker Hub 密钥

1. 进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 添加两个 Secret：
   - `DOCKER_USERNAME` = 你的 Docker Hub 用户名
   - `DOCKER_PASSWORD` = 你的 Docker Hub 密码或 Access Token

### 3️⃣ 推送工作流文件

```bash
git add .github/workflows/build-and-push.yml
git commit -m "Add CI/CD workflow"
git push
```

**完成！** GitHub 会自动构建并推送镜像到 Docker Hub。

---

## 📦 以后如何更新？

只需要正常的 Git 操作：

```bash
# 1. 修改代码
# 2. 提交并推送
git add .
git commit -m "更新功能"
git push

# 3. GitHub 自动构建新镜像
# 4. 在 NAS 上拉取新镜像
docker-compose pull
docker-compose up -d
```

---

## 🔍 查看构建状态

- GitHub 仓库 → **Actions** 标签
- 可以看到构建进度和日志
- 绿色 ✅ 表示成功，红色 ❌ 表示失败

---

## 💡 优势

- ✅ **无需本地 Docker** - 完全云端构建
- ✅ **自动触发** - 代码推送即构建
- ✅ **免费使用** - GitHub 免费额度充足
- ✅ **简单易用** - 一次设置，长期使用

详细说明请查看 [GitHub Actions部署指南.md](./GitHub Actions部署指南.md)

