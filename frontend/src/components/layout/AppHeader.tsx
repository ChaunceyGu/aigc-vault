import { Layout, Button, Dropdown, Space, Avatar, message } from 'antd'
import { PlusOutlined, UserOutlined, HeartOutlined, LogoutOutlined, LoginOutlined, SettingOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useState, useEffect } from 'react'

const { Header } = Layout

const AppHeader = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleCreateClick = () => {
    navigate('/create')
  }

  const handleLogout = () => {
    logout()
    message.success('已登出')
    if (location.pathname === '/favorites') {
      navigate('/')
    }
  }

  const userMenuItems: MenuProps['items'] = user ? [
    {
      key: 'favorites',
      label: '我的收藏',
      icon: <HeartOutlined />,
      onClick: () => navigate('/favorites')
    },
    ...(user.roles.includes('admin') ? [{
      key: 'admin',
      label: '用户管理',
      icon: <SettingOutlined />,
      onClick: () => navigate('/admin')
    }] : []),
    {
      type: 'divider'
    },
    {
      key: 'logout',
      label: '登出',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    }
  ] : [
    {
      key: 'login',
      label: '登录',
      icon: <LoginOutlined />,
      onClick: () => navigate('/login')
    }
  ]

  return (
    <Header 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: isMobile ? '0 12px' : '0 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        height: isMobile ? '56px' : '64px',
        lineHeight: isMobile ? '56px' : '64px',
      }}
    >
      <div 
        style={{ 
          color: '#fff', 
          fontSize: isMobile ? '16px' : '20px', 
          fontWeight: 600, 
          cursor: 'pointer',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        onClick={() => navigate('/')}
      >
        {isMobile ? '🎨 AI 资产归档' : '🎨 AI 绘图资产归档'}
      </div>
      <Space size={isMobile ? "small" : "middle"}>
      {location.pathname === '/' && user && (user.roles.includes('admin') || user.roles.includes('editor')) && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size={isMobile ? "middle" : "large"}
          onClick={handleCreateClick}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              minWidth: isMobile ? 'auto' : '100px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            {isMobile ? '' : '新建记录'}
          </Button>
        )}
        
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div style={{ 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? 4 : 8,
            minWidth: isMobile ? 32 : 'auto',
            justifyContent: 'center',
          }}>
            <Avatar 
              icon={<UserOutlined />} 
              size={isMobile ? "default" : "large"}
              style={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            />
            {user && !isMobile && (
              <span style={{ color: '#fff', fontWeight: 500 }}>
                {user.username}
              </span>
            )}
          </div>
        </Dropdown>
      </Space>
    </Header>
  )
}

export default AppHeader

