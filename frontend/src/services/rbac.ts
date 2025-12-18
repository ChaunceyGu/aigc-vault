/**
 * RBAC 权限管理服务
 */
import api from './api'

export interface Permission {
  id: number
  name: string
  display_name: string
  description?: string
  category: string
  created_at: string
}

export interface Role {
  id: number
  name: string
  display_name: string
  description?: string
  is_system: boolean
  created_at: string
  updated_at: string
  permissions: string[]  // 权限名称列表
}

export interface RoleCreateRequest {
  name: string
  display_name: string
  description?: string
  permission_names: string[]
}

export interface RoleUpdateRequest {
  display_name?: string
  description?: string
  permission_names?: string[]
}

/**
 * 获取权限列表
 */
export async function getPermissions(category?: string): Promise<Permission[]> {
  const params: any = {}
  if (category) params.category = category
  return await api.get('/rbac/permissions', { params })
}

/**
 * 获取角色列表
 */
export async function getRoles(): Promise<Role[]> {
  return await api.get('/rbac/roles')
}

/**
 * 获取角色详情
 */
export async function getRole(roleId: number): Promise<Role> {
  return await api.get(`/rbac/roles/${roleId}`)
}

/**
 * 创建角色
 */
export async function createRole(data: RoleCreateRequest): Promise<Role> {
  return await api.post('/rbac/roles', data)
}

/**
 * 更新角色
 */
export async function updateRole(roleId: number, data: RoleUpdateRequest): Promise<Role> {
  return await api.put(`/rbac/roles/${roleId}`, data)
}

/**
 * 删除角色
 */
export async function deleteRole(roleId: number): Promise<{ message: string }> {
  return await api.delete(`/rbac/roles/${roleId}`)
}

