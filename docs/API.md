# API 文档

本文档提供完整的 API 接口说明。

## 基础信息

- **Base URL**：`/api`
- **认证方式**：JWT Bearer Token（部分接口需要）
- **Content-Type**：`application/json`

## 认证

大部分 API 需要 JWT 认证，在请求头中添加：

```
Authorization: Bearer <token>
```

Token 通过登录接口获取，存储在 localStorage 中。

## 主要 API 端点

### 记录管理

#### 获取记录列表
```
GET /api/logs
```

**查询参数**：
- `page`：页码（默认：1）
- `page_size`：每页数量（默认：20）
- `search`：搜索关键词（标题）
- `tool`：工具标签筛选
- `model`：模型标签筛选
- `type`：类型筛选（txt2img/img2img）

**响应示例**：
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "pages": 5
}
```

#### 创建记录
```
POST /api/logs
```

**权限要求**：`log.create`

**请求体**：
```json
{
  "title": "记录标题",
  "type": "txt2img",
  "prompt": "提示词",
  "negative_prompt": "负面提示词",
  "tools": ["Stable Diffusion WebUI"],
  "models": ["SDXL"],
  "is_nsfw": false,
  "input_files": [...],
  "output_groups": [...]
}
```

#### 获取记录详情
```
GET /api/logs/{id}
```

#### 更新记录
```
PUT /api/logs/{id}
```

**权限要求**：`log.edit`

#### 删除记录
```
DELETE /api/logs/{id}
```

**权限要求**：`log.delete`

### 输出组管理

#### 添加输出组
```
POST /api/logs/{id}/output-groups
```

**权限要求**：`log.edit`

#### 更新输出组
```
PUT /api/logs/{id}/output-groups/{group_id}
```

**权限要求**：`log.edit`

#### 删除输出组
```
DELETE /api/logs/{id}/output-groups/{group_id}
```

**权限要求**：`log.edit`

### 资源管理

#### 流式传输图片
```
GET /api/assets/{file_key}/stream?size={size}
```

**参数**：
- `size`：`thumb`（缩略图）、`medium`（中等尺寸，1920px）、`original`（原图，默认）

#### 下载图片
```
GET /api/assets/{file_key}/download
```

#### 获取图片代理 URL
```
GET /api/assets/{file_key}/url
```

### 标签管理

#### 获取工具标签
```
GET /api/tags/tools
```

#### 获取模型标签
```
GET /api/tags/models
```

#### 获取标签统计
```
GET /api/tags/stats
```

### 用户认证

#### 获取验证码
```
GET /api/auth/captcha
```

**响应**：
```json
{
  "captcha_id": "验证码ID",
  "question": "15 + 3 × 4 = ?"
}
```

**说明**：
- 验证码用于登录和注册，防止暴力破解
- 验证码 5 分钟过期
- 验证码支持多种难度：简单（两位数加减）、中等（乘法/三位数运算）、困难（混合运算/大数运算）

#### 用户注册
```
POST /api/auth/register
```

**请求体**：
```json
{
  "username": "用户名",
  "password": "密码",
  "email": "邮箱（可选）",
  "captcha_id": "验证码ID",
  "captcha_answer": "验证码答案"
}
```

**说明**：
- 需要先调用 `GET /api/auth/captcha` 获取验证码
- 验证码答案必须是数字（支持负数）

#### 用户登录
```
POST /api/auth/login
```

**请求体**：
```json
{
  "username": "用户名",
  "password": "密码",
  "captcha_id": "验证码ID",
  "captcha_answer": "验证码答案"
}
```

**说明**：
- 需要先调用 `GET /api/auth/captcha` 获取验证码
- 验证码答案必须是数字（支持负数）

**响应**：
```json
{
  "access_token": "JWT token",
  "token_type": "bearer",
  "user": {...}
}
```

#### 获取当前用户信息
```
GET /api/auth/me
```

**需要认证**：是

### 收藏管理

#### 获取收藏列表
```
GET /api/favorites
```

**需要认证**：是

**查询参数**：
- `page`：页码
- `page_size`：每页数量

#### 添加收藏
```
POST /api/favorites/{log_id}
```

**需要认证**：是

#### 取消收藏
```
DELETE /api/favorites/{log_id}
```

**需要认证**：是

#### 检查是否已收藏
```
GET /api/favorites/{log_id}/check
```

**需要认证**：是

### 管理员后台

#### 获取用户列表
```
GET /api/admin/users
```

**权限要求**：`user.view`

**查询参数**：
- `page`：页码
- `page_size`：每页数量
- `search`：搜索关键词
- `role`：角色筛选

#### 获取用户详情
```
GET /api/admin/users/{user_id}
```

**权限要求**：`user.view`

#### 更新用户
```
PATCH /api/admin/users/{user_id}
```

**权限要求**：`user.edit`

#### 删除用户
```
DELETE /api/admin/users/{user_id}
```

**权限要求**：`user.delete`

#### 获取管理员统计
```
GET /api/admin/stats
```

**权限要求**：`user.view`

### RBAC 权限管理

#### 获取权限列表
```
GET /api/rbac/permissions
```

**权限要求**：`role.view`

#### 获取角色列表
```
GET /api/rbac/roles
```

**权限要求**：`role.view`

#### 创建角色
```
POST /api/rbac/roles
```

**权限要求**：`role.manage`

#### 更新角色
```
PUT /api/rbac/roles/{role_id}
```

**权限要求**：`role.manage`

#### 删除角色
```
DELETE /api/rbac/roles/{role_id}
```

**权限要求**：`role.manage`

#### 为角色分配权限
```
POST /api/rbac/roles/{role_id}/permissions/{permission_id}
```

**权限要求**：`role.manage_permissions`

#### 移除角色权限
```
DELETE /api/rbac/roles/{role_id}/permissions/{permission_id}
```

**权限要求**：`role.manage_permissions`

### 配置

#### 获取版本信息
```
GET /api/config/version
```

## 错误响应

所有错误响应格式：

```json
{
  "detail": "错误信息"
}
```

**HTTP 状态码**：
- `200`：成功
- `201`：创建成功
- `400`：请求参数错误
- `401`：未授权
- `403`：没有权限
- `404`：资源不存在
- `422`：数据验证失败
- `500`：服务器内部错误

## 在线文档

启动后端服务后，可以访问以下地址查看交互式 API 文档：

- **Swagger UI**: `http://localhost:8000/docs`（本地开发）或 `http://localhost/docs`（Docker）
- **ReDoc**: `http://localhost:8000/redoc`（本地开发）或 `http://localhost/redoc`（Docker）

## 相关文档

- [安装部署](./INSTALLATION.md)
- [开发指南](./DEVELOPMENT.md)
- [安全说明](./SECURITY.md)

