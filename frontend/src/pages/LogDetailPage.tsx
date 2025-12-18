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
  Spin,
  message,
  Row,
  Col,
  Divider,
  Tooltip,
  Badge,
  Popconfirm,
} from 'antd'
import { ArrowLeftOutlined, CopyOutlined, CheckOutlined, EditOutlined, DeleteOutlined, LeftOutlined, RightOutlined, DownloadOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import { getLogDetail, deleteLog, type LogDetail } from '../services/logs'
import NSFWImage from '../components/NSFWImage'
import FavoriteButton from '../components/FavoriteButton'
import { useAuth } from '../contexts/AuthContext'

const { Title, Text } = Typography

const LogDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [log, setLog] = useState<LogDetail | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [showNsfw, setShowNsfw] = useState(false)  // 控制NSFW内容显示
  
  // 检查是否有编辑权限（需要 log.edit 或 log.delete 权限，或拥有 editor/admin 角色）
  const canEdit = user && (user.roles.includes('admin') || user.roles.includes('editor'))

  useEffect(() => {
    if (id) {
      loadDetail()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // 确保 input_assets 和 output_groups 是数组
      if (!data.input_assets) {
        data.input_assets = []
      }
      if (!data.output_groups) {
        data.output_groups = []
      }
      console.log('加载的记录详情:', {
        id: data.id,
        log_type: data.log_type,
        input_assets_count: data.input_assets?.length || 0,
        output_assets_count: data.output_groups?.reduce((sum, group) => sum + group.assets.length, 0) || 0,
        input_assets: data.input_assets,
      })
      setLog(data)
    } catch (error: unknown) {
      console.error('加载详情失败:', error)
      const errorMessage = (error as Error)?.message || '加载详情失败'
      message.error({
        content: errorMessage,
        duration: 3,
      })
      // 如果是404，说明记录不存在，跳转到首页
      const errorMsg = (error as Error)?.message || ''
      if (errorMsg.includes('不存在') || errorMsg.includes('404')) {
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

  // 下载图片（使用后端API代理下载，支持外网访问）
  const downloadImage = async (url: string, filename: string, fileKey?: string) => {
    try {
      // 如果有file_key，使用下载接口（通过后端API代理）
      let downloadUrl = url
      if (fileKey) {
        // 使用后端API代理的下载接口，这样外网可以通过web端口下载
        downloadUrl = `/api/assets/${encodeURIComponent(fileKey)}/download`
      }
      
      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`)
      }
      const blob = await response.blob()
      const downloadUrlObj = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrlObj
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrlObj)
      message.success('下载成功')
    } catch (error) {
      console.error('下载失败:', error)
      message.error('下载失败，请重试')
    }
  }

  // 批量下载所有输出图片（压缩为 ZIP）
  const handleDownloadAll = async () => {
    if (!log || !log.output_groups || log.output_groups.length === 0) {
      message.warning('没有可下载的图片')
      return
    }

    // 收集所有输出组的图片（使用file_key获取原始图片URL）
    const allAssets: Array<{ url: string; filename: string; file_key?: string }> = []
    log.output_groups.forEach((group, groupIndex) => {
      if (group.assets && group.assets.length > 0) {
        group.assets.forEach((asset, assetIndex) => {
          const filename = `${log.title}_组${groupIndex + 1}_${assetIndex + 1}.jpg`.replace(/[<>:"/\\|?*]/g, '_')
          allAssets.push({ 
            url: asset.url, 
            filename,
            file_key: asset.file_key  // 保存file_key用于获取原始图片
          })
        })
      }
    })

    if (allAssets.length === 0) {
      message.warning('没有可下载的图片')
      return
    }

    try {
      // 动态导入 JSZip
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const loadingMessage = message.loading('正在准备下载文件...', 0)

      // 下载所有图片到 ZIP（使用后端API代理下载接口）
      for (let i = 0; i < allAssets.length; i++) {
        try {
          const asset = allAssets[i]
          // 如果有file_key，使用后端API代理的下载接口
          let downloadUrl = asset.url
          if (asset.file_key) {
            // 使用后端API代理的下载接口，这样外网可以通过web端口下载
            downloadUrl = `/api/assets/${encodeURIComponent(asset.file_key)}/download`
          }
          const response = await fetch(downloadUrl)
          if (!response.ok) {
            throw new Error(`下载失败: ${response.statusText}`)
          }
          const blob = await response.blob()
          zip.file(asset.filename, blob)
        } catch (error) {
          console.error(`下载图片失败: ${allAssets[i].filename}`, error)
        }
      }

      loadingMessage()
      const generatingMessage = message.loading('正在生成压缩包...', 0)

      // 生成 ZIP 文件
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      generatingMessage()

      // 下载 ZIP 文件
      const downloadUrl = window.URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = downloadUrl
      const safeTitle = log.title.replace(/[<>:"/\\|?*]/g, '_')
      link.download = `${safeTitle}_${allAssets.length}张图片.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      message.success(`成功打包 ${allAssets.length} 张图片为 ZIP 文件`)
    } catch (error: unknown) {
      console.error('批量下载失败:', error)
      const errorMessage = (error as Error)?.message || ''
      if (errorMessage.includes('jszip')) {
        message.error('需要安装 jszip 库，请运行: npm install jszip')
      } else {
        message.error('批量下载失败，请重试')
      }
    }
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
        <div style={{ fontSize: 18, color: '#666', marginBottom: 8 }}>记录不存在或已被删除</div>
        <Button 
          type="primary" 
          onClick={() => navigate('/')}
          style={{ marginTop: 16 }}
        >
          返回图库
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
    } catch (error: unknown) {
      console.error('删除失败:', error)
      const errorMessage = (error as Error)?.message || '删除失败，请重试'
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
          {log && <FavoriteButton logId={log.id} size="large" style={{ borderRadius: 8 }} />}
          {log.is_nsfw && (
            <Button
              icon={showNsfw ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setShowNsfw(!showNsfw)}
              size="large"
              style={{ 
                borderRadius: 8,
                background: showNsfw ? 'rgba(255, 77, 79, 0.1)' : 'rgba(24, 144, 255, 0.1)',
                borderColor: showNsfw ? '#ff4d4f' : '#1890ff',
                color: showNsfw ? '#ff4d4f' : '#1890ff',
              }}
            >
              {showNsfw ? '隐藏NSFW内容' : '显示NSFW内容'}
            </Button>
          )}
          {canEdit && (
            <>
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
                description="此操作不可撤销，所有关联的图片文件也会被永久删除。"
                onConfirm={handleDelete}
                okText="确定删除"
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
            </>
          )}
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

              {/* 工具和模型现在在输出组中显示，这里不再显示 */}

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
                  {log.prompt && log.prompt.trim() ? log.prompt : '（未填写提示词）'}
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
                  {log.params_note && log.params_note.trim() ? log.params_note : '（未填写生成参数）'}
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
                    <span>📥 参考图片（输入图片）</span>
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
                              cursor: (log.is_nsfw && !showNsfw) ? 'default' : 'pointer',  // NSFW且未显示时，禁用点击
                              marginBottom: 8,
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              border: '2px solid transparent',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            }}
                            onClick={() => {
                              // 如果是NSFW且未显示，不触发预览灯箱（由NSFWImage组件自己处理）
                              if (log.is_nsfw && !showNsfw) {
                                return
                              }
                              handleImageClick(
                                asset.url,
                                log.input_assets.map(a => a.url),
                                index
                              )
                            }}
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
                            <NSFWImage
                              src={asset.url}
                              alt={asset.note || '输入图片'}
                              isNSFW={log.is_nsfw && !showNsfw}
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
                      count={log.output_groups?.reduce((sum, group) => sum + group.assets.length, 0) || 0} 
                      style={{ 
                        marginLeft: 0,
                        backgroundColor: '#1890ff',
                        boxShadow: '0 2px 4px rgba(24, 144, 255, 0.3)',
                      }}
                      overflowCount={99}
                    />
                  </div>
                  {log.output_groups && log.output_groups.length > 0 && log.output_groups.some(g => g.assets.length > 0) && (
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadAll}
                      size="small"
                    >
                      下载全部 ({log.output_groups.reduce((sum, group) => sum + group.assets.length, 0)})
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
              {log.output_groups && log.output_groups.length > 0 ? (
                log.output_groups.map((group, groupIndex) => {
                  // 收集所有图片用于预览
                  const allImages = log.output_groups!.flatMap(g => g.assets.map(a => a.url))
                  let globalIndex = 0
                  log.output_groups!.slice(0, groupIndex).forEach(g => {
                    globalIndex += g.assets.length
                  })

                  return (
                    <div key={group.id || groupIndex} style={{ marginBottom: groupIndex < log.output_groups!.length - 1 ? 32 : 0 }}>
                      {/* 输出组标题 */}
                      {(group.tools.length > 0 || group.models.length > 0) && (
                        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                          <Space size="middle" wrap>
                            {group.tools.length > 0 && (
                              <Space size="small">
                                <span style={{ color: '#666', fontSize: 13 }}>工具:</span>
                                {group.tools.map(tool => (
                                  <Tag key={tool} style={{ margin: 0 }}>{tool}</Tag>
                                ))}
                              </Space>
                            )}
                            {group.models.length > 0 && (
                              <Space size="small">
                                <span style={{ color: '#666', fontSize: 13 }}>模型:</span>
                                {group.models.map(model => (
                                  <Tag key={model} color="purple" style={{ margin: 0 }}>{model}</Tag>
                                ))}
                              </Space>
                            )}
                          </Space>
                        </div>
                      )}
                      
                      <Row gutter={[16, 16]}>
                        {group.assets.map((asset, assetIndex) => {
                          const currentGlobalIndex = globalIndex + assetIndex
                          return (
                            <Col 
                              key={asset.id} 
                              xs={12} 
                              sm={8} 
                              md={6}
                              lg={8}
                              style={{
                                animation: `fadeIn 0.3s ease-out ${currentGlobalIndex * 0.05}s both`,
                              }}
                            >
                              <div
                                style={{
                                  aspectRatio: '1',
                                  overflow: 'hidden',
                                  borderRadius: 10,
                                  background: '#f0f0f0',
                                  cursor: (log.is_nsfw && !showNsfw) ? 'default' : 'pointer',  // NSFW且未显示时，禁用点击
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  border: '2px solid transparent',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                  position: 'relative',
                                }}
                                onClick={() => {
                                  // 如果是NSFW且未显示，不触发预览灯箱（由NSFWImage组件自己处理）
                                  if (log.is_nsfw && !showNsfw) {
                                    return
                                  }
                                  handleImageClick(
                                    asset.url,
                                    allImages,
                                    currentGlobalIndex
                                  )
                                }}
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
                                <NSFWImage
                                  src={asset.url}
                                  alt="生成结果"
                                  isNSFW={log.is_nsfw && !showNsfw}
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
                                  className="image-download-btn"
                                  style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    opacity: 0,
                                    transition: 'opacity 0.3s',
                                    zIndex: 10,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const filename = `${log.title}_${groupIndex + 1}_${assetIndex + 1}.jpg`
                                    downloadImage(asset.url, filename, asset.file_key)
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
                          )
                        })}
                      </Row>
                    </div>
                  )
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: '#999' }}>
                  暂无生成结果
                </div>
              )}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.3s ease-out',
              pointerEvents: 'auto',  // 确保可以接收点击事件
            }}
            onClick={(e) => {
              // 阻止冒泡，防止点击图片区域关闭弹窗
              e.stopPropagation()
            }}
          >
            {/* 图片 - 预览灯箱中直接显示原始图片，不再使用NSFWImage组件 */}
            <img
              src={previewImage}
              alt="预览"
              style={{ 
                maxWidth: '90vw', 
                maxHeight: '90vh',
                borderRadius: 8,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                objectFit: 'contain',
              }}
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

