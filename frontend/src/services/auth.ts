/**
 * 用户认证服务
 */
import api from './api'

export interface User {
  id: number
  username: string
  email?: string
  roles: string[]  // 角色名称列表
  is_active: boolean
  created_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  email?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

/**
 * 保存 token 和用户信息到 localStorage
 */
export function saveAuth(token: string, user: User): void {
  // 清理 token（移除可能的空格）
  const cleanToken = token.trim()
  localStorage.setItem(TOKEN_KEY, cleanToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  
  // 调试日志
  if (import.meta.env.DEV) {
    console.debug('保存 token:', cleanToken.substring(0, 20) + '...', '长度:', cleanToken.length)
  }
}

/**
 * 获取 token
 */
export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    // 清理 token（移除可能的空格）
    return token.trim()
  }
  return null
}

/**
 * 获取用户信息
 */
export function getUser(): User | null {
  const userStr = localStorage.getItem(USER_KEY)
  if (!userStr) return null
  try {
    return JSON.parse(userStr) as User
  } catch {
    return null
  }
}

/**
 * 清除认证信息
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return getToken() !== null
}

/**
 * 用户注册
 */
export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>('/auth/register', data)
  if (response.access_token) {
    saveAuth(response.access_token, response.user)
  }
  return response
}

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>('/auth/login', data)
  if (response.access_token) {
    saveAuth(response.access_token, response.user)
  }
  return response
}

/**
 * 用户登出
 */
export function logout(): void {
  clearAuth()
}

/**
 * 获取当前用户信息（从服务器）
 */
export async function getCurrentUser(): Promise<User> {
  return await api.get<User>('/auth/me')
}

