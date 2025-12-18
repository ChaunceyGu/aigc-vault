/**
 * 管理员后台服务
 */
import api from './api'

export interface UserListItem {
  id: number
  username: string
  email?: string
  roles: string[]  // 角色名称列表
  is_active: boolean
  created_at: string
}

export interface UserListResponse {
  data: UserListItem[]
  total: number
  page: number
  page_size: number
}

export interface UserUpdateRequest {
  role_names?: string[]  // 角色名称列表
  is_active?: boolean
}

export interface AdminStats {
  total_users: number
  active_users: number
  inactive_users: number
  admin_count: number
  editor_count: number
  user_count: number
}

/**
 * 获取用户列表
 */
export async function getUserList(
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  role?: string
): Promise<UserListResponse> {
  const params: any = { page, page_size: pageSize }
  if (search) params.search = search
  if (role) params.role = role
  
  return await api.get('/admin/users', { params })
}

/**
 * 获取用户详情
 */
export async function getUserDetail(userId: number): Promise<UserListItem> {
  return await api.get(`/admin/users/${userId}`)
}

/**
 * 更新用户信息
 */
export async function updateUser(
  userId: number,
  data: UserUpdateRequest
): Promise<UserListItem> {
  return await api.patch(`/admin/users/${userId}`, data)
}

/**
 * 删除用户
 */
export async function deleteUser(userId: number): Promise<{ message: string }> {
  return await api.delete(`/admin/users/${userId}`)
}

/**
 * 获取管理员统计信息
 */
export async function getAdminStats(): Promise<AdminStats> {
  return await api.get('/admin/stats')
}

