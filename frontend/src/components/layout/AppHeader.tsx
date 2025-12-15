import { Layout, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import PasswordModal from '../PasswordModal'
import { isPasswordVerified, isPasswordRequired } from '../../utils/password'

const { Header } = Layout

const AppHeader = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordRequired, setPasswordRequired] = useState<boolean | null>(null)

  // 检查是否需要密码
  useEffect(() => {
    isPasswordRequired().then((required: boolean) => {
      setPasswordRequired(required)
    })
  }, [])

  const handleCreateClick = async () => {
    // 如果不需要密码，直接跳转
    if (passwordRequired === false) {
      navigate('/create')
      return
    }
    
    // 如果需要密码，检查是否已验证
    if (isPasswordVerified()) {
      navigate('/create')
    } else {
      setShowPasswordModal(true)
    }
  }

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
      {location.pathname === '/' && (
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
      
      <PasswordModal
        open={showPasswordModal}
        onSuccess={() => {
          setShowPasswordModal(false)
          navigate('/create')
        }}
        onCancel={() => setShowPasswordModal(false)}
      />
    </Header>
  )
}

export default AppHeader

