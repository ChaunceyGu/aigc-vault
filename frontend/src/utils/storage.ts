/**
 * 本地存储工具（用于保存最近使用的标签）
 */

const STORAGE_KEYS = {
  RECENT_TOOLS: 'aigc_vault_recent_tools',
  RECENT_MODELS: 'aigc_vault_recent_models',
}

/**
 * 获取最近使用的工具标签
 */
export function getRecentTools(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_TOOLS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * 保存最近使用的工具标签
 */
export function saveRecentTool(tool: string) {
  try {
    const recent = getRecentTools()
    const updated = [tool, ...recent.filter(t => t !== tool)].slice(0, 10) // 最多保存10个
    localStorage.setItem(STORAGE_KEYS.RECENT_TOOLS, JSON.stringify(updated))
  } catch (error) {
    console.error('保存工具标签失败:', error)
  }
}

/**
 * 获取最近使用的模型标签
 */
export function getRecentModels(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_MODELS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * 保存最近使用的模型标签
 */
export function saveRecentModel(model: string) {
  try {
    const recent = getRecentModels()
    const updated = [model, ...recent.filter(m => m !== model)].slice(0, 10) // 最多保存10个
    localStorage.setItem(STORAGE_KEYS.RECENT_MODELS, JSON.stringify(updated))
  } catch (error) {
    console.error('保存模型标签失败:', error)
  }
}

