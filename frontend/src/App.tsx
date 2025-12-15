import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout, Tooltip } from 'antd'
import { lazy, Suspense } from 'react'
import AppHeader from './components/layout/AppHeader'
import BackToTop from './components/BackToTop'
import { Spin } from 'antd'
import { getFullVersionString, getVersionInfo } from './utils/version'

// 路由懒加载，优化首屏加载速度
const HomePage = lazy(() => import('./pages/HomePage'))
const CreateLogPage = lazy(() => import('./pages/CreateLogPage'))
const LogDetailPage = lazy(() => import('./pages/LogDetailPage'))
const EditLogPage = lazy(() => import('./pages/EditLogPage'))

const { Content, Footer } = Layout

function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <AppHeader />
        <Content style={{ 
          padding: '24px', 
          background: 'linear-gradient(to bottom, #fafafa 0%, #f5f5f5 100%)',
          minHeight: 'calc(100vh - 64px - 70px)',
        }}>
          <Suspense fallback={
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: '400px' 
            }}>
              <Spin size="large" tip="加载中..." />
            </div>
          }>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/create" element={<CreateLogPage />} />
              <Route path="/logs/:id" element={<LogDetailPage />} />
              <Route path="/logs/:id/edit" element={<EditLogPage />} />
            </Routes>
          </Suspense>
          <BackToTop />
        </Content>
        <Footer style={{ 
          textAlign: 'center',
          background: '#fff',
          borderTop: '1px solid #e8e8e8',
        }}>
          <div style={{ color: '#666', fontSize: 14 }}>
            AI 绘图资产归档系统 ©2025
            <Tooltip 
              title={
                <div style={{ fontSize: 12 }}>
                  <div>版本: {getFullVersionString()}</div>
                  <div style={{ marginTop: 4, opacity: 0.8 }}>
                    构建时间: {new Date(getVersionInfo().buildTime).toLocaleString('zh-CN')}
                  </div>
                </div>
              }
              placement="top"
            >
              <span 
                style={{ 
                  marginLeft: 8,
                  color: '#999',
                  fontSize: 12,
                  cursor: 'help',
                }}
              >
                v{getFullVersionString()}
              </span>
            </Tooltip>
          </div>
        </Footer>
      </Layout>
    </BrowserRouter>
  )
}

export default App

