/**
 * 版本信息工具
 * 版本信息在构建时通过 vite 插件注入
 */

export interface VersionInfo {
  version: string
  buildTime: string
  gitCommit?: string
  gitTag?: string
}

// 版本信息（构建时会被替换）
const VERSION_INFO: VersionInfo = {
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
  gitCommit: import.meta.env.VITE_GIT_COMMIT || undefined,
  gitTag: import.meta.env.VITE_GIT_TAG || undefined,
}

/**
 * 获取版本信息
 */
export function getVersionInfo(): VersionInfo {
  return VERSION_INFO
}

/**
 * 获取版本号字符串
 */
export function getVersionString(): string {
  const info = getVersionInfo()
  if (info.gitTag) {
    return info.gitTag.replace(/^v/, '') // 移除 v 前缀
  }
  return info.version
}

/**
 * 获取完整版本信息字符串
 */
export function getFullVersionString(): string {
  const info = getVersionInfo()
  const parts: string[] = []
  
  if (info.gitTag) {
    parts.push(info.gitTag.replace(/^v/, ''))
  } else {
    parts.push(info.version)
  }
  
  if (info.gitCommit) {
    parts.push(`(${info.gitCommit.substring(0, 7)})`)
  }
  
  return parts.join(' ')
}

