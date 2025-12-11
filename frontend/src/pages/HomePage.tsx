/**
 * 图库列表页面（首页）
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  Card,
  Image,
  Tag,
  Space,
  Empty,
  Pagination,
  Select,
  Button,
  Row,
  Col,
  Spin,
  message,
  Skeleton,
  Tooltip,
  Checkbox,
  Popconfirm,
} from 'antd'
import { SearchOutlined, ReloadOutlined, EyeOutlined, PictureOutlined, CheckSquareOutlined, DeleteOutlined, SortAscendingOutlined, AppstoreOutlined, UnorderedListOutlined, DownloadOutlined } from '@ant-design/icons'
import { getLogList, deleteLog, type LogItem } from '../services/logs'
import { getTagStats } from '../services/tags'
import type { TagStats } from '../services/tags'
import { cache } from '../utils/cache'

// Search 组件已移除，改用 Space.Compact

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<LogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  // 筛选条件
  const [search, setSearch] = useState('')
  const [logType, setLogType] = useState<string | undefined>()
  const [selectedTool, setSelectedTool] = useState<string | undefined>()
  const [selectedModel, setSelectedModel] = useState<string | undefined>()
  
  // 排序
  const [sortBy, setSortBy] = useState<'time_desc' | 'time_asc' | 'title_asc' | 'title_desc'>('time_desc')
  
  // 批量选择
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  
  // 视图模式：grid（网格）或 waterfall（瀑布流）
  // 从 sessionStorage 恢复视图模式，如果没有则默认为 grid
  const [viewMode, setViewMode] = useState<'grid' | 'waterfall'>(() => {
    const savedViewMode = sessionStorage.getItem('viewMode') as 'grid' | 'waterfall' | null
    return savedViewMode || 'grid'
  })
  
  // 保存视图模式到 sessionStorage
  const handleViewModeChange = (mode: 'grid' | 'waterfall') => {
    setViewMode(mode)
    sessionStorage.setItem('viewMode', mode)
  }
  
  // 标签数据
  const [tagStats, setTagStats] = useState<TagStats>({ tools: {}, models: {} })

  useEffect(() => {
    // 检查是否需要刷新（从创建/编辑页面返回时）
    const shouldRefresh = sessionStorage.getItem('refreshHomePage')
    if (shouldRefresh === 'true') {
      sessionStorage.removeItem('refreshHomePage')
      loadLogs(true) // 强制刷新
      loadTagStats(true) // 强制刷新标签统计
    } else {
      loadLogs()
      loadTagStats()
    }
  }, [page, pageSize, search, logType, selectedTool, selectedModel, sortBy])

  // 搜索快捷键：按 / 键聚焦搜索框
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 按 / 键聚焦搜索框（不在输入框中时）
      if (e.key === '/' && e.target !== document.body && 
          (e.target as HTMLElement).tagName !== 'INPUT' && 
          (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const loadLogs = async (forceRefresh = false) => {
    // 构建缓存键（包含排序）
    const cacheKey = `logs_${page}_${pageSize}_${search || ''}_${logType || ''}_${selectedTool || ''}_${selectedModel || ''}_${sortBy}`
    
    // 如果强制刷新，清除所有日志相关的缓存
    if (forceRefresh) {
      cache.clearByPrefix('logs_')
    }
    
    // 检查缓存
    const cached = cache.get<{ items: LogItem[], total: number }>(cacheKey)
    if (cached && !loading && !forceRefresh) {
      // 从缓存读取时也要应用排序（虽然缓存中已经是排序后的）
      setLogs(cached.items)
      setTotal(cached.total)
      return
    }

    setLoading(true)
    try {
      const response = await getLogList({
        page,
        pageSize,
        search: search || undefined,
        logType,
        tool: selectedTool,
        model: selectedModel,
      })
      // 应用排序
      let sortedItems = [...response.items]
      switch (sortBy) {
        case 'time_desc':
          sortedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          break
        case 'time_asc':
          sortedItems.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          break
        case 'title_asc':
          sortedItems.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
          break
        case 'title_desc':
          sortedItems.sort((a, b) => b.title.localeCompare(a.title, 'zh-CN'))
          break
      }
      
      setLogs(sortedItems)
      setTotal(response.total)
      
      // 缓存结果（1分钟）
      cache.set(cacheKey, { items: sortedItems, total: response.total }, 60 * 1000)
    } catch (error: any) {
      console.error('加载列表失败:', error)
      const errorMessage = error?.message || '加载列表失败，请刷新页面重试'
      message.error({
        content: errorMessage,
        duration: 4,
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTagStats = async (forceRefresh = false) => {
    // 缓存标签统计（5分钟）
    const cacheKey = 'tag_stats'
    
    // 如果强制刷新，清除缓存
    if (forceRefresh) {
      cache.delete(cacheKey)
    }
    
    const cached = cache.get<TagStats>(cacheKey)
    if (cached && !forceRefresh) {
      setTagStats(cached)
      return
    }

    try {
      const stats = await getTagStats()
      setTagStats(stats)
      cache.set(cacheKey, stats, 5 * 60 * 1000)
    } catch (error: any) {
      console.error('加载标签统计失败:', error)
      // 标签统计失败不影响主功能，静默失败即可
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleCardClick = (logId: number) => {
    navigate(`/logs/${logId}`)
  }

  const handleRefresh = () => {
    loadLogs(true) // 强制刷新
    loadTagStats(true) // 强制刷新标签统计
    setSelectedIds([])
  }

  // 切换选择模式
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    setSelectedIds([])
  }

  // 切换单个选择
  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.length === logs.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(logs.map(log => log.id))
    }
  }

  // 下载图片
  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      message.success('下载成功')
    } catch (error) {
      console.error('下载失败:', error)
      message.error('下载失败，请重试')
    }
  }

  // 批量下载选中记录的图片
  const handleBatchDownload = async () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要下载的记录')
      return
    }

    const selectedLogs = logs.filter(log => selectedIds.includes(log.id))
    let downloadCount = 0

    for (const log of selectedLogs) {
      if (log.preview_urls && log.preview_urls.length > 0) {
        for (let i = 0; i < log.preview_urls.length; i++) {
          const url = log.preview_urls[i]
          const filename = `${log.title}_${i + 1}.jpg`
          await downloadImage(url, filename)
          downloadCount++
          // 避免下载过快导致浏览器阻止
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
    }

    message.success(`成功下载 ${downloadCount} 张图片`)
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要删除的记录')
      return
    }

    try {
      await Promise.all(selectedIds.map(id => deleteLog(id)))
      message.success(`成功删除 ${selectedIds.length} 条记录`)
      setSelectedIds([])
      setSelectionMode(false)
      loadLogs(true) // 强制刷新，清除缓存
      loadTagStats(true) // 强制刷新标签统计
    } catch (error: any) {
      message.error('批量删除失败：' + (error?.message || '未知错误'))
    }
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 16px' }}>
      {/* 搜索和筛选栏 */}
      <Card 
        style={{ 
          marginBottom: 24,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={10}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="搜索标题、提示词... (按 / 键快速搜索)"
                  allowClear
                  onChange={(e) => {
                    if (!e.target.value) setSearch('')
                  }}
                  onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
                  size="large"
                  style={{ flex: 1 }}
                />
                <Button 
                  icon={<SearchOutlined />} 
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement
                    if (input) handleSearch(input.value)
                  }}
                  size="large"
                  type="primary"
                >
                  搜索
                </Button>
              </Space.Compact>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                style={{ width: '100%' }}
                placeholder="类型"
                allowClear
                value={logType}
                onChange={setLogType}
                size="large"
              >
                <Select.Option value="txt2img">文生图</Select.Option>
                <Select.Option value="img2img">图生图</Select.Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={5}>
              <Select
                style={{ width: '100%' }}
                placeholder="工具"
                allowClear
                value={selectedTool}
                onChange={setSelectedTool}
                showSearch
                size="large"
                filterOption={(input, option) =>
                  String(option?.label || option?.value || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {Object.keys(tagStats.tools).map(tool => (
                  <Select.Option key={tool} value={tool}>
                    {tool} ({tagStats.tools[tool]})
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={5}>
              <Select
                style={{ width: '100%' }}
                placeholder="模型"
                allowClear
                value={selectedModel}
                onChange={setSelectedModel}
                showSearch
                size="large"
                filterOption={(input, option) =>
                  String(option?.label || option?.value || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {Object.keys(tagStats.models).map(model => (
                  <Select.Option key={model} value={model}>
                    {model} ({tagStats.models[model]})
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
          
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              {total > 0 && (
                <span style={{ color: '#666', fontSize: 14 }}>
                  共找到 <strong style={{ color: '#1890ff' }}>{total}</strong> 条记录
                  {selectionMode && selectedIds.length > 0 && (
                    <span style={{ marginLeft: 12, color: '#ff4d4f' }}>
                      （已选择 <strong>{selectedIds.length}</strong> 条）
                    </span>
                  )}
                </span>
              )}
            </Col>
            <Col>
              <Space>
                <Select
                  value={sortBy}
                  onChange={setSortBy}
                  style={{ width: 140 }}
                  size="large"
                  suffixIcon={<SortAscendingOutlined />}
                >
                  <Select.Option value="time_desc">最新优先</Select.Option>
                  <Select.Option value="time_asc">最旧优先</Select.Option>
                  <Select.Option value="title_asc">标题 A-Z</Select.Option>
                  <Select.Option value="title_desc">标题 Z-A</Select.Option>
                </Select>
                <Tooltip title={viewMode === 'grid' ? '切换到瀑布流视图' : '切换到网格视图'}>
                  <Button
                    icon={viewMode === 'grid' ? <UnorderedListOutlined /> : <AppstoreOutlined />}
                    onClick={() => handleViewModeChange(viewMode === 'grid' ? 'waterfall' : 'grid')}
                    size="large"
                  />
                </Tooltip>
                <Button
                  icon={<CheckSquareOutlined />}
                  onClick={toggleSelectionMode}
                  type={selectionMode ? 'primary' : 'default'}
                  size="large"
                >
                  {selectionMode ? '取消选择' : '批量选择'}
                </Button>
                {selectionMode && selectedIds.length > 0 && (
                  <>
                    <Button
                      onClick={toggleSelectAll}
                      size="large"
                    >
                      {selectedIds.length === logs.length ? '取消全选' : '全选'}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleBatchDownload}
                      size="large"
                    >
                      批量下载 ({selectedIds.length})
                    </Button>
                    <Popconfirm
                      title={`确定要删除选中的 ${selectedIds.length} 条记录吗？`}
                      description="删除后将无法恢复，所有关联的图片文件也会被删除。"
                      onConfirm={handleBatchDelete}
                      okText="确定"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        icon={<DeleteOutlined />}
                        danger
                        size="large"
                      >
                        批量删除 ({selectedIds.length})
                      </Button>
                    </Popconfirm>
                  </>
                )}
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleRefresh}
                  loading={loading}
                  size="large"
                >
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* 图库网格 */}
      {loading && logs.length === 0 ? (
        <Row gutter={[16, 16]}>
          {[...Array(12)].map((_, i) => (
            <Col key={i} xs={24} sm={12} md={8} lg={6} xl={4}>
              <Card
                cover={
                  <Skeleton.Image 
                    active 
                    style={{ width: '100%', aspectRatio: '1' }} 
                  />
                }
              >
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : logs.length === 0 ? (
        <Empty 
          description={
            <span style={{ fontSize: 16, color: '#8c8c8c' }}>
              暂无数据，
              <a 
                onClick={() => navigate('/create')}
                style={{ 
                  color: '#1890ff',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  marginLeft: 4,
                }}
              >
                创建第一条记录
              </a>
            </span>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '80px 0' }}
        />
      ) : (
        viewMode === 'grid' ? (
          <>
            <Row gutter={[20, 20]}>
            {logs.map((log, index) => (
              <Col 
                key={log.id} 
                xs={24} 
                sm={12} 
                md={12} 
                lg={8} 
                xl={6}
                xxl={6}
                style={{
                  animation: `fadeIn 0.3s ease-out ${index * 0.02}s both`,
                }}
              >
                <Card
                  hoverable
                  cover={
                    log.cover_url ? (
                      <div 
                        style={{ 
                          aspectRatio: '1', 
                          overflow: 'hidden', 
                          background: '#f0f0f0',
                          position: 'relative',
                        }}
                      >
                        {/* 多张图片时的网格预览 */}
                        {log.preview_urls && log.preview_urls.length > 1 && log.output_count && log.output_count > 1 ? (
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: log.preview_urls.length >= 4 ? '1fr 1fr' : log.preview_urls.length === 2 ? '1fr 1fr' : '1fr 1fr',
                            gridTemplateRows: log.preview_urls.length >= 4 ? '1fr 1fr' : '1fr',
                            width: '100%',
                            height: '100%',
                            gap: '2px',
                          }}>
                            {log.preview_urls.slice(0, 4).map((url, idx) => (
                              <div key={idx} style={{ overflow: 'hidden', position: 'relative' }}>
                                <Image
                                  src={url}
                                  alt={`${log.title} - ${idx + 1}`}
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                  }}
                                  preview={false}
                                  placeholder={
                                    <div className="image-wrapper" style={{ 
                                      width: '100%', 
                                      height: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}>
                                      <Spin size="small" />
                                    </div>
                                  }
                                />
                              </div>
                            ))}
                            {/* 如果超过4张，显示更多指示器 */}
                            {log.output_count > 4 && (
                              <div style={{
                                position: 'absolute',
                                bottom: 8,
                                right: 8,
                                background: 'rgba(0, 0, 0, 0.75)',
                                color: '#fff',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                zIndex: 10,
                              }}>
                                <PictureOutlined /> +{log.output_count - 4}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* 单张图片 */
                          <Image
                            src={log.cover_url}
                            alt={log.title}
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover',
                              transition: 'transform 0.3s ease',
                            }}
                            preview={{
                              mask: (
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  gap: 8,
                                  color: '#fff'
                                }}>
                                  <EyeOutlined /> 查看
                                </div>
                              ),
                              maskClassName: 'image-preview-mask',
                            }}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBuyh8qA4/clzGRhOBBHFmbMxY7twzgxlQqgc6mC56cJ+TsSgUF9QwMDBeP6QxKFRtYmDg+kGAYZ+BhZkOA8C8xMBj+YbA8B8A8D7kMDCwJ8QoG8A4B"
                          onError={() => {
                            console.error('图片加载失败:', log.cover_url)
                            // 图片加载失败时，显示默认占位图
                          }}
                          loading="lazy"
                            placeholder={
                              <div className="image-wrapper" style={{ 
                                width: '100%', 
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999'
                              }}>
                                <Spin size="small" />
                              </div>
                            }
                          />
                        )}
                        
                        {/* 图片数量标识（多张时显示） */}
                        {log.output_count && log.output_count > 1 && (
                          <div style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            background: 'rgba(24, 144, 255, 0.9)',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            zIndex: 10,
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          }}>
                            <PictureOutlined style={{ fontSize: 12 }} />
                            {log.output_count} 张
                          </div>
                        )}
                        
                        {/* 悬停时的遮罩层 */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.3s',
                            zIndex: 5,
                          }}
                          className="image-hover-overlay"
                        >
                          <div style={{
                            background: '#fff',
                            color: '#1890ff',
                            padding: '8px 16px',
                            borderRadius: 6,
                            fontSize: 14,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          }}>
                            <EyeOutlined /> 查看详情
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        aspectRatio: '1', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                        color: '#999'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                          <div style={{ fontSize: 12 }}>无图片</div>
                        </div>
                      </div>
                    )
                  }
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelect(log.id)
                    } else {
                      handleCardClick(log.id)
                    }
                  }}
                  style={{ 
                    cursor: selectionMode ? 'default' : 'pointer',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: selectedIds.includes(log.id) ? '2px solid #1890ff' : '1px solid #e8e8e8',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: selectedIds.includes(log.id) ? '#e6f7ff' : '#fff',
                    position: 'relative',
                  }}
                  bodyStyle={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}
                  className="log-card"
                >
                  {selectionMode && (
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      zIndex: 10,
                    }}>
                      <Checkbox
                        checked={selectedIds.includes(log.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleSelect(log.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: '#fff',
                          borderRadius: '50%',
                          padding: 4,
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                    </div>
                  )}
                  <Card.Meta
                    title={
                      <Tooltip title={log.title}>
                        <div style={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          fontSize: 15,
                          fontWeight: 600,
                          marginBottom: 10,
                          color: '#262626',
                          lineHeight: 1.4,
                        }}>
                          {log.title}
                        </div>
                      </Tooltip>
                    }
                    description={
                      <div>
                        <Space size={[6, 6]} wrap style={{ marginBottom: 10 }}>
                          {log.log_type === 'img2img' && (
                            <Tag 
                              color="blue" 
                              style={{ 
                                margin: 0, 
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 4,
                                border: 'none',
                              }}
                            >
                              图生图
                            </Tag>
                          )}
                          {log.models.length > 0 && (
                            <>
                              {log.models.slice(0, 2).map(model => (
                                <Tag 
                                  key={model} 
                                  color="purple"
                                  style={{ 
                                    margin: 0, 
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    border: 'none',
                                  }}
                                >
                                  {model}
                                </Tag>
                              ))}
                              {log.models.length > 2 && (
                                <Tag 
                                  style={{ 
                                    margin: 0, 
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    background: '#f0f0f0',
                                    color: '#666',
                                    border: 'none',
                                  }}
                                >
                                  +{log.models.length - 2}
                                </Tag>
                              )}
                            </>
                          )}
                        </Space>
                        <div style={{ 
                          fontSize: 12, 
                          color: '#8c8c8c', 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: 4,
                          borderTop: '1px solid #f0f0f0',
                        }}>
                          <span>{new Date(log.created_at).toLocaleDateString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                          })}</span>
                          {log.output_count && log.output_count > 1 && (
                            <span style={{ 
                              color: '#1890ff',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}>
                              <PictureOutlined style={{ fontSize: 11 }} />
                              {log.output_count}
                            </span>
                          )}
                        </div>
                      </div>
                    }
                  />
                </Card>
                <style>{`
                  .log-card {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  }
                  .log-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                  }
                  .log-card:hover .image-hover-info {
                    opacity: 1 !important;
                  }
                  .log-card:hover .ant-image img {
                    transform: scale(1.05);
                  }
                  .image-preview-mask {
                    opacity: 0;
                    transition: opacity 0.3s;
                  }
                  .log-card:hover .image-preview-mask {
                    opacity: 1;
                  }
                  @keyframes fadeIn {
                    from {
                      opacity: 0;
                      transform: translateY(10px);
                    }
                    to {
                      opacity: 1;
                      transform: translateY(0);
                    }
                  }
                `}</style>
              </Col>
            ))}
          </Row>

          {/* 分页 */}
          {total > pageSize && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: 32,
              padding: '24px 0',
            }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(newPage, newPageSize) => {
                  setPage(newPage)
                  if (newPageSize !== pageSize) {
                    setPageSize(newPageSize)
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                showSizeChanger
                showQuickJumper
                showTotal={(total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                }
                pageSizeOptions={['12', '20', '40', '60']}
              />
            </div>
          )}
          </>
        ) : (
          /* 瀑布流视图 - 纯图片展示，无任何标签和参数 */
          <div 
            className="waterfall-container"
            style={{
              columnCount: window.innerWidth > 1400 ? 5 : window.innerWidth > 1200 ? 4 : window.innerWidth > 900 ? 3 : 2,
              columnGap: 16,
            }}
          >
            {logs.map((log, index) => {
              const coverImage = log.cover_url || (log.preview_urls && log.preview_urls[0])
              
              return (
                <div
                  key={log.id}
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelect(log.id)
                    } else {
                      handleCardClick(log.id)
                    }
                  }}
                  style={{
                    breakInside: 'avoid',
                    marginBottom: 16,
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: selectedIds.includes(log.id) ? '3px solid #1890ff' : '2px solid transparent',
                    position: 'relative',
                    animation: `fadeIn 0.3s ease-out ${index * 0.02}s both`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'inline-block',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                  className="waterfall-card"
                >
                  {selectionMode && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 10,
                    }}>
                      <Checkbox
                        checked={selectedIds.includes(log.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleSelect(log.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: '#fff',
                          borderRadius: '50%',
                          padding: 4,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                        }}
                      />
                    </div>
                  )}
                  
                  {/* 纯图片展示 */}
                  {coverImage ? (
                    <Image
                      src={coverImage}
                      alt={log.title}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        transition: 'transform 0.3s ease',
                      }}
                      preview={{
                        src: coverImage,
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    }}>
                      <PictureOutlined style={{ fontSize: 48, opacity: 0.3, color: '#999' }} />
                    </div>
                  )}
                </div>
              )
            })}
          
          {/* 分页 - 瀑布流中需要单独显示 */}
          {total > pageSize && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: 32,
              padding: '24px 0',
              width: '100%',
              columnSpan: 'all',
            }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(newPage, newPageSize) => {
                  setPage(newPage)
                  if (newPageSize !== pageSize) {
                    setPageSize(newPageSize)
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                showSizeChanger
                showQuickJumper
                showTotal={(total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                }
                pageSizeOptions={['12', '20', '40', '60']}
              />
            </div>
          )}
          </div>
        )
      )}
    </div>
  )
}

export default HomePage

