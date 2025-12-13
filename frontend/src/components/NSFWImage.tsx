/**
 * NSFW图片组件 - 对NSFW图片打马赛克
 */
import { useState } from 'react'
import { Image, Modal } from 'antd'
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
  [key: string]: any
}

const NSFWImage: React.FC<NSFWImageProps> = ({ 
  src, 
  alt, 
  isNSFW = false, 
  style,
  preview = true,
  ...rest 
}) => {
  const [blurred, setBlurred] = useState(isNSFW)
  const [showModal, setShowModal] = useState(false)

  // 处理placeholder等属性
  const { placeholder, loading, fallback, onError, ...nsfwRest } = rest

  if (!isNSFW) {
    // 非NSFW图片，正常显示
    return (
      <Image
        src={src}
        alt={alt}
        style={style}
        preview={preview}
        placeholder={placeholder}
        loading={loading}
        fallback={fallback}
        onError={onError}
        {...nsfwRest}
      />
    )
  }

  // NSFW图片，显示马赛克
  return (
    <>
      <div style={{ position: 'relative', ...style }}>
        <Image
          src={src}
          alt={alt}
          style={{
            filter: blurred ? 'blur(25px)' : 'none',
            transition: 'filter 0.3s',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          preview={false}
          placeholder={placeholder}
          loading={loading}
          fallback={fallback}
          onError={onError}
          {...nsfwRest}
        />
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
            cursor: 'pointer',
            transition: 'background 0.3s',
          }}
          onClick={() => {
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
              padding: '16px 20px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 12,
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}>
              <EyeInvisibleOutlined style={{ fontSize: 32, marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                NSFW 内容
              </div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
                点击查看（需谨慎）
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
      <Modal
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ 
          padding: 0, 
          textAlign: 'center',
          background: '#1a1a1a',
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        maskStyle={{ background: 'rgba(0, 0, 0, 0.85)' }}
      >
        <div style={{ 
          position: 'relative', 
          maxWidth: '100%',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src={src}
            alt={alt}
            style={{
              maxWidth: '90%',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255, 77, 79, 0.9)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              zIndex: 10,
            }}
            onClick={() => {
              setShowModal(false)
              setBlurred(true)
            }}
          >
            <EyeInvisibleOutlined /> 隐藏内容
          </div>
        </div>
      </Modal>
    </>
  )
}

export default NSFWImage

