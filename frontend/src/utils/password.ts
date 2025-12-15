/**
 * 密码验证工具
 */
import api from '../services/api'

const PASSWORD_VERIFIED_KEY = 'password_verified'
const PASSWORD_VERIFIED_TIMESTAMP = 'password_verified_timestamp'
const VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000 // 24小时

// 缓存密码配置，避免重复请求
let cachedPassword: string | null = null
let passwordCheckPromise: Promise<string> | null = null

/**
 * 从后端获取编辑密码
 */
export async function getEditPassword(): Promise<string> {
  // 如果已有缓存，直接返回
  if (cachedPassword !== null) {
    return cachedPassword
  }
  
  // 如果正在请求，等待请求完成
  if (passwordCheckPromise) {
    return passwordCheckPromise
  }
  
  // 发起新请求
  passwordCheckPromise = (async () => {
    try {
      const data = await api.get<{ password: string }>('/config/edit-password') as unknown as { password: string }
      const password = data.password || ''
      cachedPassword = password
      return password
    } catch (error) {
      console.error('获取密码失败:', error)
      // 如果API不存在，返回空字符串（表示不需要密码）
      cachedPassword = ''
      return ''
    } finally {
      passwordCheckPromise = null
    }
  })()
  
  return passwordCheckPromise
}

/**
 * 检查是否需要密码（异步，需要先获取密码配置）
 */
export async function isPasswordRequired(): Promise<boolean> {
  const password = await getEditPassword()
  return password !== '' && password !== null && password !== undefined
}

/**
 * 检查是否已通过密码验证
 * 注意：如果未配置密码，此函数会返回false，需要配合isPasswordRequired使用
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

