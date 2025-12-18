/**
 * 收藏按钮组件
 */
import React, { useState, useEffect } from 'react'
import { Button, message, Tooltip } from 'antd'
import { HeartOutlined, HeartFilled } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { addFavorite, removeFavorite, checkFavorite } from '../services/favorites'

interface FavoriteButtonProps {
  logId: number
  size?: 'small' | 'middle' | 'large'
  style?: React.CSSProperties
}

export default function FavoriteButton({ logId, size = 'middle', style }: FavoriteButtonProps) {
  const { user } = useAuth()
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // 检查是否已收藏
  useEffect(() => {
    if (!user) {
      setChecking(false)
      return
    }

    const check = async () => {
      try {
        const result = await checkFavorite(logId)
        setIsFavorited(result.is_favorited)
      } catch (error) {
        console.error('检查收藏状态失败:', error)
      } finally {
        setChecking(false)
      }
    }

    check()
  }, [user, logId])

  const handleToggle = async () => {
    if (!user) {
      message.warning('请先登录')
      return
    }

    setLoading(true)
    try {
      if (isFavorited) {
        await removeFavorite(logId)
        setIsFavorited(false)
        message.success('已取消收藏')
      } else {
        await addFavorite(logId)
        setIsFavorited(true)
        message.success('已添加收藏')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '操作失败，请重试'
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  if (checking) {
    return (
      <Button
        icon={<HeartOutlined />}
        size={size}
        style={style}
        loading
      />
    )
  }

  return (
    <Tooltip title={isFavorited ? '取消收藏' : '添加收藏'}>
      <Button
        type={isFavorited ? 'primary' : 'default'}
        danger={isFavorited}
        icon={isFavorited ? <HeartFilled /> : <HeartOutlined />}
        size={size}
        style={style}
        loading={loading}
        onClick={handleToggle}
      >
        {isFavorited ? '已收藏' : '收藏'}
      </Button>
    </Tooltip>
  )
}

