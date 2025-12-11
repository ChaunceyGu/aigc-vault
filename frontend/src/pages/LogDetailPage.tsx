/**
 * 记录详情页面
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Image,
  Spin,
  message,
  Row,
  Col,
  Divider,
  Tooltip,
  Badge,
  Popconfirm,
} from 'antd'
import { ArrowLeftOutlined, CopyOutlined, CheckOutlined, EditOutlined, DeleteOutlined, LeftOutlined, RightOutlined, DownloadOutlined } from '@ant-design/icons'
import { getLogDetail, deleteLog, type LogDetail } from '../services/logs'

const { Title, Text } = Typography

const LogDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [log, setLog] = useState<LogDetail | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewImages, setPreviewImages] = useState<string[]>([])

  useEffect(() => {
    if (id) {
      loadDetail()
    }
  }, [id])

  // ESC 键关闭预览，左右箭头切换图片
  useEffect(() => {
    if (!previewVisible) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewVisible(false)
      } else if (e.key === 'ArrowLeft' && previewIndex > 0) {
        const newIndex = previewIndex - 1
        setPreviewIndex(newIndex)
        setPreviewImage(previewImages[newIndex])
      } else if (e.key === 'ArrowRight' && previewIndex < previewImages.length - 1) {
        const newIndex = previewIndex + 1
        setPreviewIndex(newIndex)
        setPreviewImage(previewImages[newIndex])
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewVisible, previewIndex, previewImages])

  const loadDetail = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getLogDetail(Number(id))
      // 确保 input_assets 和 output_assets 是数组
      if (!data.input_assets) {
        data.input_assets = []
      }
      if (!data.output_assets) {
        data.output_assets = []
      }
      console.log('加载的记录详情:', {
        id: data.id,
        log_type: data.log_type,
        input_assets_count: data.input_assets?.length || 0,
        output_assets_count: data.output_assets?.length || 0,
        input_assets: data.input_assets,
      })
      setLog(data)
    } catch (error: any) {
      console.error('加载详情失败:', error)
      const errorMessage = error?.message || '加载详情失败'
      message.error({
        content: errorMessage,
        duration: 3,
      })
      // 如果是404，说明记录不存在，跳转到首页
      if (error?.message?.includes('不存在') || error?.message?.includes('404')) {
        setTimeout(() => navigate('/'), 2000)
      } else {
        setTimeout(() => navigate('/'), 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  const [copiedText, setCopiedText] = useState<string | null>(null)

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      message.success({
        content: `✅ ${label}已复制`,
        duration: 1.5,
        icon: <CheckOutlined style={{ color: '#52c41a' }} />,
      })
      setTimeout(() => setCopiedText(null), 2000)
    } catch (error) {
      message.error({
        content: '复制失败，请手动复制',
        duration: 2,
      })
    }
  }

  const handleImageClick = (url: string, images: string[], index: number) => {
    setPreviewImages(images)
    setPreviewIndex(index)
    setPreviewImage(url)
    setPreviewVisible(true)
  }

  const handlePrevImage = () => {
    if (previewIndex > 0) {
      const newIndex = previewIndex - 1
      setPreviewIndex(newIndex)
      setPreviewImage(previewImages[newIndex])
    }
  }

  const handleNextImage = () => {
    if (previewIndex < previewImages.length - 1) {
      const newIndex = previewIndex + 1
      setPreviewIndex(newIndex)
      setPreviewImage(previewImages[newIndex])
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

  // 批量下载所有输出图片
  const handleDownloadAll = async () => {
    if (!log || !log.output_assets || log.output_assets.length === 0) {
      message.warning('没有可下载的图片')
      return
    }

    for (let i = 0; i < log.output_assets.length; i++) {
      const asset = log.output_assets[i]
      const filename = asset.note 
        ? `${log.title}_${asset.note}_${i + 1}.jpg`
        : `${log.title}_${i + 1}.jpg`
      await downloadImage(asset.url, filename)
      // 避免下载过快导致浏览器阻止
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    message.success(`成功下载 ${log.output_assets.length} 张图片`)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!log && !loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '80px 20px',
        maxWidth: 600,
        margin: '0 auto',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <div style={{ fontSize: 18, color: '#666', marginBottom: 8 }}>记录不存在</div>
        <Button 
          type="primary" 
          onClick={() => navigate('/')}
          style={{ marginTop: 16 }}
        >
          返回首页
        </Button>
      </div>
    )
  }

  if (!log) {
    return null
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteLog(Number(id))
      message.success({
        content: '删除成功',
        duration: 2,
      })
      // 设置刷新标志，返回首页时自动刷新
      sessionStorage.setItem('refreshHomePage', 'true')
      navigate('/')
    } catch (error: any) {
      console.error('删除失败:', error)
      const errorMessage = error?.message || '删除失败，请重试'
      message.error({
        content: errorMessage,
        duration: 3,
      })
    }
  }

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px' }}>
      {/* 顶部操作栏 */}
      <div style={{ 
        marginBottom: 24, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px 0',
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
          size="large"
          style={{ borderRadius: 8 }}
        >
          返回图库
        </Button>
        <Space size="middle">
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/logs/${id}/edit`)}
            size="large"
            type="primary"
            style={{ borderRadius: 8 }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这条记录吗？"
            description="删除后将无法恢复，所有关联的图片文件也会被删除。"
            onConfirm={handleDelete}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="large"
              style={{ borderRadius: 8 }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Row gutter={32}>
        {/* 左侧：元数据面板 */}
        <Col xs={24} lg={9}>
          <Card 
            title={
              <div style={{ fontSize: 20, fontWeight: 600, color: '#262626' }}>📋 元数据</div>
            }
            style={{ 
              marginBottom: 24,
              borderRadius: 12,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e8e8e8',
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={3} style={{ 
                  marginBottom: 16, 
                  fontWeight: 700,
                  fontSize: 24,
                  color: '#262626',
                  lineHeight: 1.4,
                }}>
                  {log.title}
                </Title>
                <div>
                  <Tag 
                    color={log.log_type === 'img2img' ? 'blue' : 'default'}
                    style={{ 
                      fontSize: 13, 
                      padding: '6px 16px',
                      borderRadius: 6,
                      border: 'none',
                      fontWeight: 500,
                    }}
                  >
                    {log.log_type === 'img2img' ? '图生图' : '文生图'}
                  </Tag>
                </div>
              </div>
              
              <Divider style={{ margin: '20px 0', borderColor: '#e8e8e8' }} />

              {log.tools.length > 0 && (
                <div>
                  <Text strong style={{ fontSize: 15, color: '#595959', display: 'block', marginBottom: 12 }}>🛠️ 工具</Text>
                  <div>
                    <Space size={[8, 8]} wrap>
                      {log.tools.map(tool => (
                        <Tag 
                          key={tool}
                          style={{ 
                            fontSize: 13, 
                            padding: '4px 12px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#f0f0f0',
                            color: '#595959',
                          }}
                        >
                          {tool}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </div>
              )}

              {log.models.length > 0 && (
                <div>
                  <Text strong style={{ fontSize: 15, color: '#595959', display: 'block', marginBottom: 12 }}>🤖 模型</Text>
                  <div>
                    <Space size={[8, 8]} wrap>
                      {log.models.map(model => (
                        <Tag 
                          key={model} 
                          color="purple"
                          style={{ 
                            fontSize: 13, 
                            padding: '4px 12px',
                            borderRadius: 6,
                            border: 'none',
                            fontWeight: 500,
                          }}
                        >
                          {model}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </div>
              )}

              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: 12 
                }}>
                  <Text strong style={{ fontSize: 15, color: '#595959' }}>✨ 提示词</Text>
                  {log.prompt && log.prompt.trim() && (
                    <Tooltip title={copiedText === log.prompt ? '已复制' : '复制提示词'}>
                      <Button
                        type="text"
                        size="small"
                        icon={copiedText === log.prompt ? <CheckOutlined /> : <CopyOutlined />}
                        onClick={() => handleCopy(log.prompt!, '提示词')}
                        style={{ 
                          color: copiedText === log.prompt ? '#52c41a' : '#1890ff',
                          fontWeight: 500,
                        }}
                      >
                        {copiedText === log.prompt ? '已复制' : '复制'}
                      </Button>
                    </Tooltip>
                  )}
                </div>
                <div
                  style={{
                    padding: 16,
                    background: log.prompt && log.prompt.trim() ? '#fafafa' : '#f5f5f5',
                    borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 300,
                    overflowY: 'auto',
                    fontSize: 14,
                    lineHeight: 1.8,
                    fontFamily: log.prompt && log.prompt.trim() ? 'monospace' : 'inherit',
                    border: '1px solid #e8e8e8',
                    color: log.prompt && log.prompt.trim() ? '#262626' : '#8c8c8c',
                    fontStyle: log.prompt && log.prompt.trim() ? 'normal' : 'italic',
                  }}
                >
                  {log.prompt && log.prompt.trim() ? log.prompt : '（未填写）'}
                </div>
              </div>

              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: 12 
                }}>
                  <Text strong style={{ fontSize: 15, color: '#595959' }}>⚙️ 参数记录</Text>
                  {log.params_note && log.params_note.trim() && (
                    <Tooltip title={copiedText === log.params_note ? '已复制' : '复制参数'}>
                      <Button
                        type="text"
                        size="small"
                        icon={copiedText === log.params_note ? <CheckOutlined /> : <CopyOutlined />}
                        onClick={() => handleCopy(log.params_note!, '参数记录')}
                        style={{ 
                          color: copiedText === log.params_note ? '#52c41a' : '#1890ff',
                          fontWeight: 500,
                        }}
                      >
                        {copiedText === log.params_note ? '已复制' : '复制'}
                      </Button>
                    </Tooltip>
                  )}
                </div>
                <div
                  style={{
                    padding: 16,
                    background: log.params_note && log.params_note.trim() ? '#fafafa' : '#f5f5f5',
                    borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 250,
                    overflowY: 'auto',
                    fontSize: 14,
                    lineHeight: 1.8,
                    border: '1px solid #e8e8e8',
                    color: log.params_note && log.params_note.trim() ? '#262626' : '#8c8c8c',
                    fontStyle: log.params_note && log.params_note.trim() ? 'normal' : 'italic',
                  }}
                >
                  {log.params_note && log.params_note.trim() ? log.params_note : '（未填写）'}
                </div>
              </div>

              <Divider style={{ margin: '20px 0', borderColor: '#e8e8e8' }} />

              <div style={{ 
                padding: '12px 16px',
                background: '#f9f9f9',
                borderRadius: 8,
                border: '1px solid #e8e8e8',
              }}>
                <Text type="secondary" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📅</span>
                  <span>创建时间：{new Date(log.created_at).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</span>
                </Text>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 右侧：画廊面板 */}
        <Col xs={24} lg={15}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 输入素材区（仅 img2img） */}
            {log.log_type === 'img2img' && (
              <Card 
                title={
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#262626', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📥 原始参考</span>
                    {log.input_assets && log.input_assets.length > 0 && (
                      <Badge 
                        count={log.input_assets.length} 
                        style={{ 
                          marginLeft: 0,
                          backgroundColor: '#ff4d4f',
                          boxShadow: '0 2px 4px rgba(255, 77, 79, 0.3)',
                        }}
                        overflowCount={99}
                      />
                    )}
                  </div>
                }
                style={{ 
                  borderRadius: 12,
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e8e8e8',
                }}
                bodyStyle={{ padding: '24px' }}
              >
                {log.input_assets && log.input_assets.length > 0 ? (
                  <Row gutter={[16, 16]}>
                    {log.input_assets.map((asset, index) => (
                      <Col 
                        key={asset.id} 
                        xs={12} 
                        sm={8} 
                        md={6}
                        lg={8}
                        style={{
                          animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              aspectRatio: '1',
                              overflow: 'hidden',
                              borderRadius: 10,
                              background: '#f0f0f0',
                              cursor: 'pointer',
                              marginBottom: 8,
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              border: '2px solid transparent',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            }}
                            onClick={() => handleImageClick(
                              asset.url,
                              log.input_assets.map(a => a.url),
                              index
                            )}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#1890ff'
                              e.currentTarget.style.transform = 'scale(1.03)'
                              e.currentTarget.style.boxShadow = '0 8px 24px rgba(24, 144, 255, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'transparent'
                              e.currentTarget.style.transform = 'scale(1)'
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            <Image
                              src={asset.url}
                              alt={asset.note || '输入图片'}
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover',
                                transition: 'transform 0.3s',
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
                          {asset.note && (
                            <Tooltip title={asset.note}>
                              <Text 
                                type="secondary" 
                                style={{ 
                                  fontSize: 12,
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  padding: '4px 0',
                                  color: '#595959',
                                }}
                              >
                                {asset.note}
                              </Text>
                            </Tooltip>
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div style={{ 
                    padding: '60px 20px', 
                    textAlign: 'center',
                    color: '#8c8c8c',
                    background: '#fafafa',
                    borderRadius: 8,
                    border: '2px dashed #e8e8e8',
                  }}>
                    <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>📷</div>
                    <div style={{ fontSize: 14 }}>未上传原始参考图片</div>
                  </div>
                )}
              </Card>
            )}

            {/* 生成结果区 */}
            <Card 
              title={
                <div style={{ fontSize: 18, fontWeight: 600, color: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🎨 生成样张</span>
                    <Badge 
                      count={log.output_assets.length} 
                      style={{ 
                        marginLeft: 0,
                        backgroundColor: '#1890ff',
                        boxShadow: '0 2px 4px rgba(24, 144, 255, 0.3)',
                      }}
                      overflowCount={99}
                    />
                  </div>
                  {log.output_assets.length > 0 && (
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadAll}
                      size="small"
                    >
                      下载全部 ({log.output_assets.length})
                    </Button>
                  )}
                </div>
              }
              style={{ 
                borderRadius: 12,
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e8e8e8',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <Row gutter={[16, 16]}>
                {log.output_assets.map((asset, index) => (
                  <Col 
                    key={asset.id} 
                    xs={12} 
                    sm={8} 
                    md={6}
                    lg={8}
                    style={{
                      animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: '1',
                        overflow: 'hidden',
                        borderRadius: 10,
                        background: '#f0f0f0',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '2px solid transparent',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      }}
                      onClick={() => handleImageClick(
                        asset.url,
                        log.output_assets.map(a => a.url),
                        index
                      )}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#1890ff'
                        e.currentTarget.style.transform = 'scale(1.03)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(24, 144, 255, 0.3)'
                        const downloadBtn = e.currentTarget.querySelector('.image-download-btn') as HTMLElement
                        if (downloadBtn) downloadBtn.style.opacity = '1'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent'
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
                        const downloadBtn = e.currentTarget.querySelector('.image-download-btn') as HTMLElement
                        if (downloadBtn) downloadBtn.style.opacity = '0'
                      }}
                    >
                      <Image
                        src={asset.url}
                        alt="生成结果"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          transition: 'transform 0.3s',
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
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          opacity: 0,
                          transition: 'opacity 0.3s',
                          zIndex: 10,
                        }}
                        className="image-download-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          const filename = asset.note 
                            ? `${log.title}_${asset.note}_${index + 1}.jpg`
                            : `${log.title}_${index + 1}.jpg`
                          downloadImage(asset.url, filename)
                        }}
                      >
                        <Button
                          type="primary"
                          shape="circle"
                          icon={<DownloadOutlined />}
                          size="small"
                          style={{
                            background: 'rgba(24, 144, 255, 0.9)',
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                          }}
                        />
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* 图片预览灯箱（支持轮播） */}
      {previewVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'pointer',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setPreviewVisible(false)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 图片 */}
            <Image
              src={previewImage}
              style={{ 
                maxWidth: '90vw', 
                maxHeight: '90vh',
                borderRadius: 8,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                objectFit: 'contain',
              }}
              preview={false}
            />
            
            {/* 左侧切换按钮（多图时显示） */}
            {previewImages.length > 1 && previewIndex > 0 && (
              <Button
                type="primary"
                shape="circle"
                icon={<LeftOutlined />}
                size="large"
                style={{
                  position: 'absolute',
                  left: 24,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  width: 56,
                  height: 56,
                  fontSize: 20,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrevImage()
                }}
              />
            )}
            
            {/* 右侧切换按钮（多图时显示） */}
            {previewImages.length > 1 && previewIndex < previewImages.length - 1 && (
              <Button
                type="primary"
                shape="circle"
                icon={<RightOutlined />}
                size="large"
                style={{
                  position: 'absolute',
                  right: 24,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  width: 56,
                  height: 56,
                  fontSize: 20,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleNextImage()
                }}
              />
            )}
            
            {/* 关闭按钮 */}
            <div
              style={{
                position: 'absolute',
                top: 24,
                right: 24,
                background: 'rgba(0, 0, 0, 0.6)',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: 6,
                fontSize: 14,
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onClick={(e) => {
                e.stopPropagation()
                setPreviewVisible(false)
              }}
            >
              <span>关闭 (ESC)</span>
            </div>
            
            {/* 图片计数（多图时显示） */}
            {previewImages.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: 20,
                  fontSize: 14,
                  zIndex: 10,
                }}
              >
                {previewIndex + 1} / {previewImages.length}
              </div>
            )}
          </div>
        </div>
      )}
      
    </div>
  )
}

export default LogDetailPage

