/**
 * API 服务配置
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // TODO: 添加认证 token 等
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 返回 response.data，这样调用方直接得到数据而不是 AxiosResponse
    return response.data as any
  },
  (error) => {
    // 统一错误处理
    if (error.response) {
      // 服务器返回了错误响应
      const status = error.response.status
      const data = error.response.data
      
      let message = '请求失败'
      
      if (status === 400) {
        message = data?.detail || data?.message || '请求参数错误，请检查输入'
      } else if (status === 401) {
        message = '未授权，请重新登录'
      } else if (status === 403) {
        message = '没有权限访问此资源'
      } else if (status === 404) {
        message = data?.detail || '资源不存在'
      } else if (status === 413) {
        message = '文件太大，请上传较小的文件'
      } else if (status === 422) {
        message = data?.detail || '数据验证失败，请检查输入'
      } else if (status === 500) {
        message = data?.detail || '服务器内部错误，请稍后重试'
      } else if (status >= 500) {
        message = '服务器错误，请稍后重试'
      } else {
        message = data?.detail || data?.message || '请求失败'
      }
      
      console.error('API Error:', status, message, data)
      return Promise.reject(new Error(message))
    } else if (error.request) {
      // 请求已发出但没有收到响应
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout')
      const message = isTimeout ? '请求超时，请检查网络连接或稍后重试' : '网络错误，请检查连接'
      console.error('API Error: 网络错误', error.request, error.message)
      return Promise.reject(new Error(message))
    } else {
      // 其他错误
      console.error('API Error:', error.message)
      return Promise.reject(new Error(error.message || '未知错误'))
    }
  }
)

export default api

