/**
 * 用户认证 Context
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser, getUser, getToken, saveAuth } from '../services/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, email?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 初始化时从 localStorage 加载用户信息
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = getToken()
        if (token) {
          const localUser = getUser()
          if (localUser) {
            // 先设置本地用户信息，避免闪烁
            setUser(localUser)
            // 验证 token 是否有效
            try {
              const serverUser = await getCurrentUser()
              // 更新服务器返回的最新用户信息
              setUser(serverUser)
              // 更新本地存储的用户信息
              saveAuth(token, serverUser)
            } catch (error) {
              // Token 无效或过期，清除本地信息
              console.warn('Token 验证失败，清除认证信息:', error)
              apiLogout()
              setUser(null)
            }
          } else {
            // 有 token 但没有用户信息，尝试从服务器获取
            try {
              const serverUser = await getCurrentUser()
              setUser(serverUser)
              saveAuth(token, serverUser)
            } catch {
              apiLogout()
              setUser(null)
            }
          }
        }
      } catch (error) {
        console.error('初始化认证失败:', error)
        apiLogout()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    initAuth()
  }, [])

  const login = async (username: string, password: string) => {
    const response = await apiLogin({ username, password })
    setUser(response.user)
  }

  const register = async (username: string, password: string, email?: string) => {
    const response = await apiRegister({ username, password, email })
    setUser(response.user)
  }

  const logout = () => {
    apiLogout()
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const serverUser = await getCurrentUser()
      setUser(serverUser)
    } catch (error) {
      console.error('刷新用户信息失败:', error)
      logout()
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

