import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from 'antd'
import AppHeader from './components/layout/AppHeader'
import BackToTop from './components/BackToTop'
import HomePage from './pages/HomePage'
import CreateLogPage from './pages/CreateLogPage'
import LogDetailPage from './pages/LogDetailPage'
import EditLogPage from './pages/EditLogPage'

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
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateLogPage />} />
            <Route path="/logs/:id" element={<LogDetailPage />} />
            <Route path="/logs/:id/edit" element={<EditLogPage />} />
          </Routes>
          <BackToTop />
        </Content>
        <Footer style={{ 
          textAlign: 'center',
          background: '#fff',
          borderTop: '1px solid #e8e8e8',
        }}>
          <div style={{ color: '#666', fontSize: 14 }}>
            AI 绘图资产归档系统 ©2025
          </div>
        </Footer>
      </Layout>
    </BrowserRouter>
  )
}

export default App

