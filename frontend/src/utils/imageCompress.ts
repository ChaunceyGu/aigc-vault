/**
 * 图片压缩工具
 * 用于在上传前压缩图片，减少传输量
 */

interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'webp'
}

/**
 * 压缩图片
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩后的 Blob
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1920,  // 最大宽度（用于列表显示）
    maxHeight = 1920, // 最大高度
    quality = 0.85,  // 压缩质量（0-1）
    format = 'jpeg'   // 输出格式
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // 计算新尺寸（保持宽高比）
        let width = img.width
        let height = img.height
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }
        
        // 创建 canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        // 绘制图片
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建 canvas 上下文'))
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        // 转换为 Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('图片压缩失败'))
            }
          },
          `image/${format}`,
          quality
        )
      }
      
      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }
      
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * 检查是否需要压缩
 * @param file 图片文件
 * @param maxSize 最大文件大小（字节），超过此大小才压缩
 * @returns 是否需要压缩
 */
export function shouldCompress(file: File, maxSize: number = 2 * 1024 * 1024): boolean {
  // 如果文件小于 maxSize，不压缩
  if (file.size < maxSize) {
    return false
  }
  
  // 检查是否为图片格式
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  return imageTypes.includes(file.type)
}

/**
 * 智能压缩：根据文件大小决定是否压缩
 * @param file 原始文件
 * @param options 压缩选项
 * @returns 压缩后的文件或原文件
 */
export async function smartCompress(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  // 如果不需要压缩，直接返回原文件
  if (!shouldCompress(file)) {
    return file
  }
  
  try {
    const compressedBlob = await compressImage(file, options)
    
    // 如果压缩后反而更大，返回原文件
    if (compressedBlob.size >= file.size) {
      return file
    }
    
    // 创建新的 File 对象
    return new File(
      [compressedBlob],
      file.name.replace(/\.(png|webp)$/i, '.jpg'), // 统一转换为 jpg
      {
        type: 'image/jpeg',
        lastModified: file.lastModified
      }
    )
  } catch (error) {
    console.warn('图片压缩失败，使用原文件:', error)
    return file
  }
}

