/**
 * 密码验证工具
 */
import api from '../services/api'

const PASSWORD_VERIFIED_KEY = 'password_verified'
const PASSWORD_VERIFIED_TIMESTAMP = 'password_verified_timestamp'
const VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000 // 24小时

/**
 * 从后端获取编辑密码
 */
export async function getEditPassword(): Promise<string> {
  try {
    const data = await api.get<{ password: string }>('/config/edit-password') as unknown as { password: string }
    return data.password || ''
  } catch (error) {
    console.error('获取密码失败:', error)
    // 如果API不存在，返回空字符串（表示不需要密码）
    return ''
  }
}

/**
 * 检查是否已通过密码验证
 */
export function isPasswordVerified(): boolean {
  const verified = sessionStorage.getItem(PASSWORD_VERIFIED_KEY)
  const timestamp = sessionStorage.getItem(PASSWORD_VERIFIED_TIMESTAMP)
  
  if (!verified || !timestamp) {
    return false
  }
  
  // 检查是否过期
  const now = Date.now()
  const verifiedTime = parseInt(timestamp, 10)
  if (now - verifiedTime > VERIFICATION_EXPIRY) {
    // 过期，清除验证状态
    clearPasswordVerification()
    return false
  }
  
  return verified === 'true'
}

/**
 * 设置密码验证状态
 */
export function setPasswordVerified(): void {
  sessionStorage.setItem(PASSWORD_VERIFIED_KEY, 'true')
  sessionStorage.setItem(PASSWORD_VERIFIED_TIMESTAMP, Date.now().toString())
}

/**
 * 清除密码验证状态
 */
export function clearPasswordVerification(): void {
  sessionStorage.removeItem(PASSWORD_VERIFIED_KEY)
  sessionStorage.removeItem(PASSWORD_VERIFIED_TIMESTAMP)
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const correctPassword = await getEditPassword()
    if (!correctPassword) {
      // 如果没有配置密码，允许通过
      return true
    }
    return password === correctPassword
  } catch (error) {
    console.error('验证密码失败:', error)
    return false
  }
}

