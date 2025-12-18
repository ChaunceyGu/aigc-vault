/**
 * 收藏服务
 */
import api from './api'

export interface FavoriteLog {
  id: number
  log_id: number
  created_at: string
  log: {
    id: number
    title: string
    log_type: string
    tools: string[]
    models: string[]
    prompt?: string
    is_nsfw: boolean
    cover_url?: string
    preview_urls: string[]
    created_at: string
  }
}

export interface FavoriteListResponse {
  data: FavoriteLog[]
  total: number
  page: number
  page_size: number
}

/**
 * 添加收藏
 */
export async function addFavorite(logId: number): Promise<{ message: string; id: number }> {
  return await api.post(`/favorites/${logId}`)
}

/**
 * 取消收藏
 */
export async function removeFavorite(logId: number): Promise<{ message: string }> {
  return await api.delete(`/favorites/${logId}`)
}

/**
 * 检查是否已收藏
 */
export async function checkFavorite(logId: number): Promise<{ is_favorited: boolean }> {
  return await api.get(`/favorites/check/${logId}`)
}

/**
 * 获取收藏列表
 */
export async function getFavorites(page: number = 1, pageSize: number = 20): Promise<FavoriteListResponse> {
  return await api.get('/favorites/', {
    params: { page, page_size: pageSize }
  })
}

/**
 * 获取收藏总数
 */
export async function getFavoriteCount(): Promise<{ count: number }> {
  return await api.get('/favorites/count')
}

