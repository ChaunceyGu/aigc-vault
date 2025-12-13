import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// 获取 Git 信息（安全处理，避免在非 Git 环境中出错）
function getGitInfo() {
  try {
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    let tag = ''
    try {
      tag = execSync('git describe --tags --exact-match HEAD 2>/dev/null', { 
        encoding: 'utf-8', 
        stdio: ['ignore', 'pipe', 'ignore'] 
      }).trim()
    } catch {
      // 没有标签时忽略错误
    }
    return { commit, tag }
  } catch {
    return { commit: '', tag: '' }
  }
}

// 获取 package.json 版本
function getPackageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
    return pkg.version || '1.0.0'
  } catch {
    return '1.0.0'
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 优先使用环境变量（Docker 构建时注入），否则从 Git 获取
  const packageVersion = process.env.VITE_APP_VERSION || getPackageVersion()
  const buildTime = process.env.VITE_BUILD_TIME || new Date().toISOString()
  const gitCommit = process.env.VITE_GIT_COMMIT || ''
  const gitTag = process.env.VITE_GIT_TAG || ''
  
  // 如果环境变量没有，尝试从 Git 获取（本地开发时）
  const gitInfo = gitCommit ? { commit: gitCommit, tag: gitTag } : getGitInfo()

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageVersion),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
      'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(gitInfo.commit || ''),
      'import.meta.env.VITE_GIT_TAG': JSON.stringify(gitInfo.tag || ''),
    },
    server: {
      port: 5176,
      host: '0.0.0.0', 
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})

