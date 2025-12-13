/**
 * 生成日志相关 API
 */
import api from './api'

export interface OutputGroup {
  tools: string[]
  models: string[]
  outputFiles: File[]
}

export interface CreateLogParams {
  title: string
  logType: 'txt2img' | 'img2img'
  prompt?: string
  paramsNote?: string
  inputFiles?: File[]
  inputNotes?: Record<string, string>
  outputGroups: OutputGroup[]  // 输出组列表，每个组包含工具、模型和图片
  isNsfw?: boolean  // 是否为NSFW内容
}

export interface LogItem {
  id: number
  title: string
  log_type: string
  tools: string[]
  models: string[]
  cover_url?: string
  output_count?: number  // 输出图片总数
  preview_urls?: string[]  // 预览图 URL（最多4张）
  created_at: string
  is_nsfw?: boolean  // 是否为NSFW内容
}

export interface OutputGroupData {
  id: number | null
  tools: string[]
  models: string[]
  assets: AssetItem[]
}

export interface LogDetail extends Omit<LogItem, 'tools' | 'models'> {
  prompt?: string
  params_note?: string
  input_assets: AssetItem[]
  output_groups: OutputGroupData[]  // 按输出组组织的图片
}

export interface AssetItem {
  id: number
  file_key: string
  url: string
  note?: string
  sort_order: number
}

export interface LogListResponse {
  total: number
  page: number
  page_size: number
  items: LogItem[]
}

/**
 * 创建新记录
 */
export async function createLog(params: CreateLogParams) {
  const formData = new FormData()
  
  formData.append('title', params.title)
  formData.append('log_type', params.logType)
  
  if (params.prompt) {
    formData.append('prompt', params.prompt)
  }
  
  if (params.paramsNote) {
    formData.append('params_note', params.paramsNote)
  }
  
  // NSFW标记
  if (params.isNsfw !== undefined) {
    formData.append('is_nsfw', params.isNsfw.toString())
  }
  
  // 输入文件（仅 img2img）
  if (params.logType === 'img2img' && params.inputFiles && params.inputFiles.length > 0) {
    params.inputFiles.forEach(file => {
      formData.append('input_files', file)
    })
    
    // 输入备注
    if (params.inputNotes) {
      formData.append('input_notes', JSON.stringify(params.inputNotes))
    }
  }
  
  // 构建输出组JSON和文件列表
  const outputGroupsJson = params.outputGroups.map(group => ({
    tools: group.tools,
    models: group.models,
    file_count: group.outputFiles.length
  }))
  formData.append('output_groups', JSON.stringify(outputGroupsJson))
  
  // 按组的顺序添加输出文件
  params.outputGroups.forEach(group => {
    group.outputFiles.forEach(file => {
      formData.append('output_files', file)
    })
  })
  
  const response = await api.post('/logs/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response
}

/**
 * 获取记录列表
 */
export async function getLogList(params: {
  page?: number
  pageSize?: number
  search?: string
  logType?: string
  tool?: string
  model?: string
}): Promise<LogListResponse> {
  const searchParams = new URLSearchParams()
  
  if (params.page) searchParams.append('page', params.page.toString())
  if (params.pageSize) searchParams.append('page_size', params.pageSize.toString())
  if (params.search) searchParams.append('search', params.search)
  if (params.logType) searchParams.append('log_type', params.logType)
  if (params.tool) searchParams.append('tool', params.tool)
  if (params.model) searchParams.append('model', params.model)
  
  const response = await api.get<LogListResponse>(`/logs/?${searchParams.toString()}`)
  return response as unknown as LogListResponse
}

/**
 * 获取记录详情
 */
export async function getLogDetail(logId: number): Promise<LogDetail> {
  const response = await api.get<LogDetail>(`/logs/${logId}`)
  return response as unknown as LogDetail
}

/**
 * 更新记录
 */
export async function updateLog(
  logId: number,
  params: {
    title: string
    logType: 'txt2img' | 'img2img'
    prompt?: string
    paramsNote?: string
    comparisonGroupId?: number | null  // null=从对比组中移除, -1=创建新对比组, >0=加入现有对比组
    isNsfw?: boolean  // 是否为NSFW内容
  }
) {
  const formData = new FormData()
  
  formData.append('title', params.title)
  formData.append('log_type', params.logType)
  
  if (params.prompt) {
    formData.append('prompt', params.prompt)
  }
  
  if (params.paramsNote) {
    formData.append('params_note', params.paramsNote)
  }
  
  // NSFW标记
  if (params.isNsfw !== undefined) {
    formData.append('is_nsfw', params.isNsfw.toString())
  }
  
  const response = await api.put(`/logs/${logId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response
}

/**
 * 添加输出组到现有记录
 */
export async function addOutputGroup(
  logId: number,
  params: {
    tools?: string[]
    models?: string[]
    outputFiles: File[]
  }
) {
  const formData = new FormData()
  
  if (params.tools && params.tools.length > 0) {
    formData.append('tools', params.tools.join(','))
  }
  
  if (params.models && params.models.length > 0) {
    formData.append('models', params.models.join(','))
  }
  
  params.outputFiles.forEach(file => {
    formData.append('output_files', file)
  })
  
  const response = await api.post(`/logs/${logId}/output-groups`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response
}

/**
 * 更新输出组
 */
export async function updateOutputGroup(
  logId: number,
  groupId: number,
  params: {
    tools?: string[]
    models?: string[]
    removeAssetIds?: number[]
    outputFiles?: File[]
  }
) {
  const formData = new FormData()
  
  if (params.tools !== undefined) {
    if (params.tools.length > 0) {
      formData.append('tools', params.tools.join(','))
    } else {
      formData.append('tools', '')
    }
  }
  
  if (params.models !== undefined) {
    if (params.models.length > 0) {
      formData.append('models', params.models.join(','))
    } else {
      formData.append('models', '')
    }
  }
  
  if (params.removeAssetIds && params.removeAssetIds.length > 0) {
    formData.append('remove_asset_ids', JSON.stringify(params.removeAssetIds))
  }
  
  if (params.outputFiles && params.outputFiles.length > 0) {
    params.outputFiles.forEach(file => {
      formData.append('output_files', file)
    })
  }
  
  const response = await api.put(`/logs/${logId}/output-groups/${groupId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response
}

/**
 * 删除输出组
 */
export async function deleteOutputGroup(logId: number, groupId: number) {
  const response = await api.delete(`/logs/${logId}/output-groups/${groupId}`)
  return response
}

/**
 * 删除记录
 */
export async function deleteLog(logId: number) {
  const response = await api.delete(`/logs/${logId}`)
  return response
}

