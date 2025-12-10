/**
 * 图库列表页面（首页）
 */
import { useState, useEffect, useRef } from 'react'
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
} from 'antd'
import { SearchOutlined, ReloadOutlined, EyeOutlined, PictureOutlined } from '@ant-design/icons'
import { getLogList, type LogItem } from '../services/logs'
import { getTagStats } from '../services/tags'
import type { TagStats } from '../services/tags'
import { cache } from '../utils/cache'

const { Search } = Input

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
  
  // 标签数据
  const [tagStats, setTagStats] = useState<TagStats>({ tools: {}, models: {} })

  useEffect(() => {
    loadLogs()
    loadTagStats()
  }, [page, pageSize, search, logType, selectedTool, selectedModel])

  const loadLogs = async () => {
    // 构建缓存键
    const cacheKey = `logs_${page}_${pageSize}_${search || ''}_${logType || ''}_${selectedTool || ''}_${selectedModel || ''}`
    
    // 检查缓存
    const cached = cache.get<{ items: LogItem[], total: number }>(cacheKey)
    if (cached && !loading) {
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
      setLogs(response.items)
      setTotal(response.total)
      
      // 缓存结果（1分钟）
      cache.set(cacheKey, { items: response.items, total: response.total }, 60 * 1000)
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

  const loadTagStats = async () => {
    // 缓存标签统计（5分钟）
    const cacheKey = 'tag_stats'
    const cached = cache.get<TagStats>(cacheKey)
    if (cached) {
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
    loadLogs()
    loadTagStats()
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
              <Search
                placeholder="搜索标题、提示词..."
                allowClear
                enterButton={<SearchOutlined />}
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && setSearch('')}
                size="large"
              />
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
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
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
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
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
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {total > 0 && (
              <span style={{ color: '#666', fontSize: 14 }}>
                共找到 <strong style={{ color: '#1890ff' }}>{total}</strong> 条记录
              </span>
            )}
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={loading}
            >
              刷新
            </Button>
          </div>
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
          description="暂无数据" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '60px 0' }}
        />
      ) : (
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
                          onError={(e) => {
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
                  onClick={() => handleCardClick(log.id)}
                  style={{ 
                    cursor: 'pointer',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid #e8e8e8',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#fff',
                  }}
                  bodyStyle={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}
                  className="log-card"
                >
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
      )}
    </div>
  )
}

export default HomePage
