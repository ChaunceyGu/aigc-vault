/**
 * 标签相关 API
 */
import api from './api'

export interface TagStats {
  tools: Record<string, number>
  models: Record<string, number>
}

/**
 * 获取所有工具标签
 */
export async function getTools(): Promise<string[]> {
  const response = await api.get<string[]>('/tags/tools')
  return response as unknown as string[]
}

/**
 * 获取所有模型标签
 */
export async function getModels(): Promise<string[]> {
  const response = await api.get<string[]>('/tags/models')
  return response as unknown as string[]
}

/**
 * 获取标签统计
 */
export async function getTagStats(): Promise<TagStats> {
  const response = await api.get<TagStats>('/tags/stats')
  return response as unknown as TagStats
}

