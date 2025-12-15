/**
 * NSFW图片组件 - 对NSFW图片打马赛克
 */
import { useState, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { Image, Spin } from 'antd'
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'

interface NSFWImageProps {
  src: string
  alt?: string
  isNSFW?: boolean
  style?: React.CSSProperties
  preview?: boolean | {
    src?: string
    mask?: React.ReactNode
  }
  placeholder?: React.ReactNode
  loading?: 'lazy' | 'eager'
  fallback?: string
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void
  disableModal?: boolean  // 禁用Modal功能，用于瀑布流等场景，点击时直接由外层处理
}

const NSFWImage: React.FC<NSFWImageProps> = ({ 
  src, 
  alt, 
  isNSFW = false, 
  style,
  preview = true,
  disableModal = false,  // 默认不禁用Modal
  ...rest 
}) => {
  const [blurred, setBlurred] = useState(isNSFW)
  const [showModal, setShowModal] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)  // 图片加载重试次数
  const maxRetries = 2  // 最大重试次数

  // 键盘事件处理（ESC关闭）
  useEffect(() => {
    if (!showModal) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false)
        setBlurred(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal])

  // 处理placeholder等属性
  const { placeholder, loading, fallback, onError, ...nsfwRest } = rest

  // 图片加载完成
  const handleLoad = () => {
    setImageLoading(false)
    setImageError(false)
    setRetryCount(0)  // 加载成功后重置重试次数
  }

  // 图片加载错误，支持重试
  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (retryCount < maxRetries) {
      // 重试加载图片
      setRetryCount(prev => prev + 1)
      setImageLoading(true)
      setImageError(false)
      // 通过添加时间戳强制重新加载
      const img = event.currentTarget
      const originalSrc = img.src.split('?')[0]
      img.src = `${originalSrc}?retry=${retryCount + 1}&t=${Date.now()}`
    } else {
      setImageLoading(false)
      setImageError(true)
      if (onError) {
        onError(event)
      }
    }
  }

  // 当 src 改变时重置状态
  useEffect(() => {
    setImageLoading(true)
    setImageError(false)
    setRetryCount(0)  // 重置重试次数
  }, [src])

  // 默认占位符：渐变骨架屏（Shimmer 效果）
  const defaultPlaceholder = (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <Spin size="small" tip="加载中..." />
    </div>
  )

  if (!isNSFW) {
    // 非NSFW图片，正常显示
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
        {imageLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}>
            {placeholder || defaultPlaceholder}
          </div>
        )}
        <Image
          src={src}
          alt={alt}
          style={{
            ...style,
            opacity: imageLoading ? 0 : 1,
            transition: 'opacity 0.4s ease-in-out',
            willChange: imageLoading ? 'opacity' : 'auto',
          }}
          preview={preview}
          placeholder={null}
          loading={loading || 'lazy'}
          fallback={fallback}
          onLoad={handleLoad}
          onError={handleError}
          {...nsfwRest}
        />
        {imageError && !fallback && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            color: '#999',
            fontSize: 12,
          }}>
            图片加载失败
          </div>
        )}
      </div>
    )
  }

  // NSFW图片，显示马赛克
  return (
    <>
      <div style={{ position: 'relative', ...style }}>
        {imageLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}>
            {placeholder || defaultPlaceholder}
          </div>
        )}
        <Image
          src={src}
          alt={alt}
          style={{
            filter: blurred ? 'blur(25px)' : 'none',
            transition: 'filter 0.3s, opacity 0.4s ease-in-out',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imageLoading ? 0 : 1,
            willChange: imageLoading ? 'opacity' : 'auto',
          }}
          preview={false}
          placeholder={null}
          loading={loading || 'lazy'}
          fallback={fallback}
          onLoad={handleLoad}
          onError={handleError}
          {...nsfwRest}
        />
        {imageError && !fallback && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            color: '#999',
            fontSize: 12,
            zIndex: 2,
          }}>
            图片加载失败
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: blurred ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
            cursor: disableModal ? 'inherit' : 'pointer',  // 如果禁用Modal，使用继承的cursor
            transition: 'background 0.3s',
            zIndex: 3,  // 确保遮罩层在最上层
            pointerEvents: disableModal ? 'none' : 'auto',  // 如果禁用Modal，禁用指针事件
          }}
          onClick={(e) => {
            if (disableModal) {
              // 如果禁用Modal，不处理点击事件，让外层处理
              return
            }
            e.stopPropagation()  // 阻止事件冒泡，避免触发外层的点击事件
            if (blurred) {
              setShowModal(true)
            } else {
              setBlurred(true)
            }
          }}
        >
          {blurred && (
            <div style={{
              textAlign: 'center',
              color: '#fff',
              padding: '12px 16px',
              background: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 8,
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}>
              <EyeInvisibleOutlined style={{ fontSize: 24, marginBottom: 4 }} />
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                NSFW
              </div>
            </div>
          )}
        </div>
        {!blurred && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(255, 77, 79, 0.9)',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation()
              setBlurred(true)
            }}
          >
            <EyeOutlined /> 隐藏
          </div>
        )}
      </div>
      {/* 统一使用与详情页相同的灯箱样式 - 使用Portal渲染到body，避免被父元素overflow限制 */}
      {showModal && createPortal(
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
            zIndex: 9999,  // 提高z-index，确保在最上层
            cursor: 'pointer',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => {
            setShowModal(false)
            setBlurred(true)  // 关闭Modal时同时恢复模糊状态
          }}
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
            {/* 图片 - 与详情页预览样式一致 */}
            <img
              src={src}
              alt={alt}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                borderRadius: 8,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                objectFit: 'contain',
              }}
            />
            
            {/* 关闭按钮 - 与详情页样式一致 */}
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
                setShowModal(false)
                setBlurred(true)  // 关闭Modal时同时恢复模糊状态
              }}
            >
              <span>关闭 (ESC)</span>
            </div>
          </div>
        </div>,
        document.body  // 渲染到body，避免被父元素限制
      )}
    </>
  )
}

// 使用React.memo优化性能，避免不必要的重新渲染
export default memo(NSFWImage, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时重新渲染
  return (
    prevProps.src === nextProps.src &&
    prevProps.isNSFW === nextProps.isNSFW &&
    prevProps.disableModal === nextProps.disableModal &&
    prevProps.style?.width === nextProps.style?.width &&
    prevProps.style?.height === nextProps.style?.height
  )
})

