/**
 * 收藏夹页面
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Tag,
  Space,
  Empty,
  Pagination,
  Row,
  Col,
  message,
  Skeleton,
  Button,
  Spin,
} from 'antd'
import { HeartFilled, ArrowLeftOutlined } from '@ant-design/icons'
import { getFavorites, type FavoriteLog } from '../services/favorites'
import { useAuth } from '../contexts/AuthContext'
import NSFWImage from '../components/NSFWImage'

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [favorites, setFavorites] = useState<FavoriteLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [pageLoadSeed] = useState(() => Math.floor(Math.random() * 1000000))

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!authLoading && !user) {
      message.warning('请先登录')
      navigate('/login')
    }
  }, [user, authLoading, navigate])

  const loadFavorites = async () => {
    if (!user) return
    setLoading(true)
    try {
      const response = await getFavorites(page, pageSize)
      setFavorites(response.data)
      setTotal(response.total)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '加载收藏失败'
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 加载收藏列表（等待认证完成）
  useEffect(() => {
    if (!authLoading && user) {
      loadFavorites()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, page, pageSize])

  // 如果正在加载认证状态，显示加载中
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  // 如果未登录，不渲染内容（会重定向）
  if (!user) {
    return null
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
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            size="large"
            style={{ borderRadius: 8 }}
          >
            返回图库
          </Button>
          <div style={{ fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HeartFilled style={{ color: '#ff4d4f' }} />
            我的收藏
          </div>
        </Space>
      </div>

      {loading ? (
        <Row gutter={[16, 16]}>
          {[...Array(6)].map((_, i) => (
            <Col xs={24} sm={12} md={8} lg={6} xl={4} key={i}>
              <Card>
                <Skeleton.Image active style={{ width: '100%', height: 200 }} />
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : favorites.length === 0 ? (
        <Empty
          description="还没有收藏任何记录"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => navigate('/')}>
            去图库看看
          </Button>
        </Empty>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {favorites.map((favorite) => {
              const log = favorite.log
              let coverImage = log.cover_url
              if (!coverImage && log.preview_urls && log.preview_urls.length > 0) {
                const seed = Math.floor((log.id * 137 + pageLoadSeed) % log.preview_urls.length)
                coverImage = log.preview_urls[seed]
              }

              return (
                <Col xs={24} sm={12} md={8} lg={6} xl={4} key={favorite.id}>
                  <Card
                    hoverable
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                    cover={
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: '#f0f0f0',
                        }}
                        onClick={() => navigate(`/logs/${log.id}`)}
                      >
                        {coverImage ? (
                          <NSFWImage
                            src={coverImage}
                            alt={log.title}
                            isNSFW={log.is_nsfw || false}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                            preview={false}
                            disableModal={true}
                            loading="lazy"
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#999',
                            }}
                          >
                            暂无图片
                          </div>
                        )}
                      </div>
                    }
                    onClick={() => navigate(`/logs/${log.id}`)}
                  >
                    <Card.Meta
                      title={
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/logs/${log.id}`)
                          }}
                        >
                          {log.title}
                        </div>
                      }
                      description={
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <div>
                            {log.tools && log.tools.length > 0 && (
                              <Space wrap size={[4, 4]}>
                                {log.tools.slice(0, 3).map((tool, idx) => (
                                  <Tag key={idx} color="blue" style={{ margin: 0 }}>
                                    {tool}
                                  </Tag>
                                ))}
                                {log.tools.length > 3 && (
                                  <Tag color="default" style={{ margin: 0 }}>
                                    +{log.tools.length - 3}
                                  </Tag>
                                )}
                              </Space>
                            )}
                          </div>
                          <div>
                            {log.models && log.models.length > 0 && (
                              <Space wrap size={[4, 4]}>
                                {log.models.slice(0, 3).map((model, idx) => (
                                  <Tag key={idx} color="purple" style={{ margin: 0 }}>
                                    {model}
                                  </Tag>
                                ))}
                                {log.models.length > 3 && (
                                  <Tag color="default" style={{ margin: 0 }}>
                                    +{log.models.length - 3}
                                  </Tag>
                                )}
                              </Space>
                            )}
                          </div>
                        </Space>
                      }
                    />
                  </Card>
                </Col>
              )
            })}
          </Row>

          {total > pageSize && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 条`}
                onChange={(newPage, newPageSize) => {
                  setPage(newPage)
                  setPageSize(newPageSize)
                }}
                onShowSizeChange={(_, newPageSize) => {
                  setPage(1)
                  setPageSize(newPageSize)
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default FavoritesPage

