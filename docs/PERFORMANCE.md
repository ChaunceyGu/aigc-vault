# 性能优化

本文档说明系统的性能优化策略和最佳实践。

## 目录

- [后端优化](#后端优化)
- [前端优化](#前端优化)
- [Nginx 优化](#nginx-优化)
- [性能提升预期](#性能提升预期)

## 后端优化

### API 响应缓存

- **标签统计、工具列表、模型列表**使用内存缓存（5分钟）
- 数据修改时自动清除相关缓存
- 减少数据库查询，提升响应速度

**实现**：
- 使用 `SimpleCache` 类进行内存缓存
- 缓存键基于查询参数
- 自动过期机制

### 数据库查询优化

- **批量查询**替代 N+1 查询
- 使用 `joinedload` 预加载关联数据
- 减少数据库往返次数，提升查询效率 50-70%

**优化示例**：
```python
# 优化前：N+1 查询
for log in logs:
    for group in log.output_groups:  # 每次循环都查询数据库
        ...

# 优化后：批量查询
logs = session.query(GenLog).options(
    joinedload(GenLog.output_groups)
).all()
```

### 图片处理优化

- **多尺寸支持**：缩略图、中等尺寸（1920px）、原图
- 列表显示使用中等尺寸，减少传输量 60-80%
- 智能缓存策略：
  - 中等尺寸图片缓存1年
  - 原图缓存1小时

## 前端优化

### 图片压缩

- **上传前自动压缩**：>2MB 的图片自动压缩
- 压缩参数：最大尺寸 1920x1920，质量 85%
- 减少上传传输量 50-70%

**实现**：
- 使用 Canvas API 进行客户端压缩
- 智能判断是否需要压缩
- 保持图片质量的同时减少文件大小

### 代码分割

- **路由懒加载**：使用 `React.lazy` 和 `Suspense`
- 按需加载页面组件
- 减少首屏加载时间 20-30%

**实现**：
```typescript
const AdminPage = lazy(() => import('./pages/AdminPage'));
```

### 组件优化

- **React.memo**：优化组件渲染
- **useCallback** 和 **useMemo**：优化计算
- **防抖搜索**：减少 API 请求

**示例**：
```typescript
const MemoizedComponent = React.memo(Component);
const debouncedSearch = useCallback(
  debounce((value) => {
    // 搜索逻辑
  }, 300),
  []
);
```

### 图片懒加载

- 使用 `loading="lazy"` 属性
- 图片进入视口时才加载
- 减少初始页面加载时间

## Nginx 优化

### Gzip 压缩

- **压缩级别 6**（性能与压缩率平衡）
- 支持多种文件类型压缩
- 减少传输量 60-80%

**配置**：
```nginx
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;
```

### 静态资源缓存

- **静态资源缓存 1 年**
- HTML 文件不缓存（确保更新及时）
- 图片 API 根据尺寸设置不同缓存时间

**配置**：
```nginx
# 静态资源
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# 图片 API
location ~* /api/assets/.*/stream\?size=(thumb|medium) {
    proxy_cache_valid 200 1y;
}
```

### 代理优化

- **优化缓冲设置**
- 关闭静态资源访问日志
- 提升代理性能

## 性能提升预期

### API 响应时间

- **标签 API**：缓存命中时响应时间从 ~100-200ms 降至 <1ms
- **列表查询**：批量查询减少数据库往返，提升 50-70%

### 页面加载

- **首屏加载**：代码分割减少初始包大小，提升 20-30%
- **图片加载**：中等尺寸图片 + 缓存，列表加载速度提升 60-80%

### 网络传输

- **Gzip 压缩**：减少传输量 60-80%
- **图片压缩**：上传前压缩，减少传输量 50-70%
- **总体传输**：Gzip + 图片压缩，减少传输量 70-85%

### 用户体验

- **搜索响应**：防抖优化，减少不必要的请求
- **图片预览**：懒加载 + 缓存，提升加载速度
- **上传体验**：进度显示 + 压缩，提升上传速度

## 性能监控

### 前端性能

- 使用浏览器开发者工具 Performance 面板
- 监控首屏加载时间
- 检查网络请求时间

### 后端性能

- 查看 API 响应时间
- 监控数据库查询时间
- 检查缓存命中率

### 优化建议

1. **定期审查**：定期检查性能指标
2. **持续优化**：根据实际使用情况调整优化策略
3. **监控告警**：设置性能告警阈值

## 相关文档

- [安装部署](./INSTALLATION.md)
- [开发指南](./DEVELOPMENT.md)
- [配置说明](./CONFIGURATION.md)

