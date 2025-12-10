import { Layout, Menu } from 'antd'
import { PlusOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Header } = Layout

const AppHeader = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/',
      icon: <AppstoreOutlined />,
      label: '图库',
    },
    {
      key: '/create',
      icon: <PlusOutlined />,
      label: '新建记录',
    },
  ]

  return (
    <Header 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div style={{ 
        color: '#fff', 
        fontSize: '20px', 
        fontWeight: 600, 
        marginRight: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        🎨 AI 绘图资产归档
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ flex: 1, minWidth: 0, background: 'transparent' }}
      />
    </Header>
  )
}

export default AppHeader

