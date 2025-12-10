/**
 * 生成日志相关 API
 */
import api from './api'

export interface CreateLogParams {
  title: string
  logType: 'txt2img' | 'img2img'
  tools?: string[]
  models?: string[]
  prompt?: string
  paramsNote?: string
  inputFiles?: File[]
  inputNotes?: Record<string, string>
  outputFiles: File[]
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
}

export interface LogDetail extends LogItem {
  prompt?: string
  params_note?: string
  input_assets: AssetItem[]
  output_assets: AssetItem[]
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
  
  if (params.tools && params.tools.length > 0) {
    formData.append('tools', params.tools.join(','))
  }
  
  if (params.models && params.models.length > 0) {
    formData.append('models', params.models.join(','))
  }
  
  if (params.prompt) {
    formData.append('prompt', params.prompt)
  }
  
  if (params.paramsNote) {
    formData.append('params_note', params.paramsNote)
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
  
  // 输出文件
  params.outputFiles.forEach(file => {
    formData.append('output_files', file)
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
    tools?: string[]
    models?: string[]
    prompt?: string
    paramsNote?: string
  }
) {
  const formData = new FormData()
  
  formData.append('title', params.title)
  formData.append('log_type', params.logType)
  
  if (params.tools && params.tools.length > 0) {
    formData.append('tools', params.tools.join(','))
  }
  
  if (params.models && params.models.length > 0) {
    formData.append('models', params.models.join(','))
  }
  
  if (params.prompt) {
    formData.append('prompt', params.prompt)
  }
  
  if (params.paramsNote) {
    formData.append('params_note', params.paramsNote)
  }
  
  const response = await api.put(`/logs/${logId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response
}

/**
 * 删除记录
 */
export async function deleteLog(logId: number) {
  const response = await api.delete(`/logs/${logId}`)
  return response
}

