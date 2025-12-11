/**
 * 简单的内存缓存工具
 */
interface CacheItem<T> {
  data: T
  timestamp: number
  expiresIn: number
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>()

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param expiresIn 过期时间（毫秒），默认 5 分钟
   */
  set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    })
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据，如果过期或不存在则返回 null
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) {
      return null
    }

    const now = Date.now()
    if (now - item.timestamp > item.expiresIn) {
      // 过期，删除
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) {
      return false
    }

    const now = Date.now()
    if (now - item.timestamp > item.expiresIn) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 清除所有以指定前缀开头的缓存
   */
  clearByPrefix(prefix: string): void {
    const keysToDelete: string[] = []
    // 遍历所有缓存键
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    }
    // 删除匹配的缓存
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

// 导出单例
export const cache = new SimpleCache()

