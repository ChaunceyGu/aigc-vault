import { useState, useEffect } from 'react'
import { Button } from 'antd'
import { ArrowUpOutlined } from '@ant-design/icons'

const BackToTop = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!visible) return null

  return (
    <Button
      type="primary"
      shape="circle"
      icon={<ArrowUpOutlined />}
      size="large"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 100,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        width: 48,
        height: 48,
        animation: 'fadeIn 0.3s ease-out',
      }}
    />
  )
}

export default BackToTop

