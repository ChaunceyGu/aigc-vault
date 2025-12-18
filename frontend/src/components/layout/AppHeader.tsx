import { Layout, Button, Dropdown, Space, Avatar, message } from 'antd'
import { PlusOutlined, UserOutlined, HeartOutlined, LogoutOutlined, LoginOutlined, SettingOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const { Header } = Layout

const AppHeader = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

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
        padding: '0 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div 
        style={{ 
          color: '#fff', 
          fontSize: '20px', 
          fontWeight: 600, 
          cursor: 'pointer',
        }}
        onClick={() => navigate('/')}
      >
        🎨 AI 绘图资产归档
      </div>
      <Space size="middle">
      {location.pathname === '/' && user && (user.roles.includes('admin') || user.roles.includes('editor')) && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleCreateClick}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            新建记录
          </Button>
        )}
        
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar 
              icon={<UserOutlined />} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            />
            {user && (
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

