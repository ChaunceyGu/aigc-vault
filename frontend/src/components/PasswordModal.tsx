/**
 * 密码验证对话框
 */
import { useState } from 'react'
import { Modal, Input, message } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { verifyPassword, setPasswordVerified } from '../utils/password'

interface PasswordModalProps {
  open: boolean
  onSuccess: () => void
  onCancel: () => void
}

const PasswordModal: React.FC<PasswordModalProps> = ({ open, onSuccess, onCancel }) => {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOk = async () => {
    setLoading(true)
    try {
      // 先检查是否需要密码
      const { isPasswordRequired } = await import('../utils/password')
      const required = await isPasswordRequired()
      
      // 如果不需要密码，直接通过
      if (!required) {
        setPasswordVerified()
        message.success('验证成功')
        setPassword('')
        onSuccess()
        setLoading(false)
        return
      }
      
      // 如果需要密码，验证输入
      if (!password.trim()) {
        message.warning('请输入密码')
        setLoading(false)
        return
      }

      const isValid = await verifyPassword(password)
      if (isValid) {
        setPasswordVerified()
        message.success('验证成功')
        setPassword('')
        onSuccess()
      } else {
        message.error('密码错误，请重试')
        setPassword('')
      }
    } catch (error) {
      message.error('验证失败，请重试')
      console.error('密码验证错误:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setPassword('')
    onCancel()
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LockOutlined style={{ fontSize: 18, color: '#1890ff' }} />
          <span>需要密码验证</span>
        </div>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="验证"
      cancelText="取消"
      maskClosable={false}
      closable={false}
    >
      <div style={{ padding: '20px 0' }}>
        <p style={{ marginBottom: 16, color: '#666' }}>
          此操作需要输入编辑密码才能继续
        </p>
        <Input.Password
          placeholder="请输入编辑密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleOk}
          size="large"
          prefix={<LockOutlined />}
          autoFocus
        />
      </div>
    </Modal>
  )
}

export default PasswordModal

