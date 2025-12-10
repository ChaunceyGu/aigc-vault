/**
 * 编辑记录页面
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Form,
  Input,
  Radio,
  Button,
  message,
  Card,
  Space,
  Spin,
} from 'antd'
import TagsInput from '../components/TagsInput'
import { updateLog, getLogDetail, type LogDetail } from '../services/logs'
import { getTools, getModels } from '../services/tags'
import { getRecentTools, saveRecentTool, getRecentModels, saveRecentModel } from '../utils/storage'

const { TextArea } = Input

const EditLogPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [logType, setLogType] = useState<'txt2img' | 'img2img'>('txt2img')
  const [loading, setLoading] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [logDetail, setLogDetail] = useState<LogDetail | null>(null)
  
  // 标签相关
  const [allTools, setAllTools] = useState<string[]>([])
  const [allModels, setAllModels] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])

  // 加载记录详情和标签列表
  useEffect(() => {
    if (id) {
      loadDetail()
      loadTags()
    }
  }, [id])

  const loadDetail = async () => {
    if (!id) return
    setLoadingDetail(true)
    try {
      const data = await getLogDetail(Number(id))
      setLogDetail(data)
      setLogType(data.log_type as 'txt2img' | 'img2img')
      setTools(data.tools || [])
      setModels(data.models || [])
      
      // 设置表单初始值
      form.setFieldsValue({
        title: data.title,
        logType: data.log_type,
        prompt: data.prompt || '',
        paramsNote: data.params_note || '',
      })
    } catch (error) {
      console.error('加载详情失败:', error)
      message.error('加载记录失败')
      navigate('/')
    } finally {
      setLoadingDetail(false)
    }
  }

  const loadTags = async () => {
    try {
      const [toolsData, modelsData] = await Promise.all([
        getTools(),
        getModels(),
      ])
      setAllTools(toolsData)
      setAllModels(modelsData)
    } catch (error) {
      console.error('加载标签失败:', error)
    }
  }

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (!id) return

    setLoading(true)
    try {
      // 保存最近使用的标签
      tools.forEach(saveRecentTool)
      models.forEach(saveRecentModel)

      await updateLog(Number(id), {
        title: values.title,
        logType: logType,
        tools: tools.length > 0 ? tools : undefined,
        models: models.length > 0 ? models : undefined,
        prompt: values.prompt?.trim() || undefined,
        paramsNote: values.paramsNote?.trim() || undefined,
      })

      message.success('更新成功！')
      navigate(`/logs/${id}`)
    } catch (error: any) {
      console.error('更新失败:', error)
      message.error(error.response?.data?.detail || '更新失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (loadingDetail) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!logDetail) {
    return <div>记录不存在</div>
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      <Card 
        title={
          <div style={{ fontSize: 20, fontWeight: 600 }}>
            ✏️ 编辑记录
          </div>
        }
        style={{ 
          marginBottom: 24,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
        >
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="例如：春日公主主题" />
          </Form.Item>

          <Form.Item
            label="类型"
            name="logType"
            initialValue="txt2img"
          >
            <Radio.Group
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
            >
              <Radio value="txt2img">文生图 (txt2img)</Radio>
              <Radio value="img2img">图生图 (img2img)</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="工具">
            <TagsInput
              value={tools}
              onChange={setTools}
              placeholder="输入工具名称，如：Stable Diffusion WebUI"
              recentTags={getRecentTools()}
              allTags={allTools}
            />
          </Form.Item>

          <Form.Item label="模型">
            <TagsInput
              value={models}
              onChange={setModels}
              placeholder="输入模型名称，如：SDXL 1.0"
              recentTags={getRecentModels()}
              allTags={allModels}
            />
          </Form.Item>

          <Form.Item 
            name="prompt"
            label={
              <span>
                <strong>提示词 (Prompt)</strong>
                <span style={{ marginLeft: 8, color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                  可选
                </span>
              </span>
            }
          >
            <TextArea
              rows={4}
              placeholder="输入正向提示词..."
              showCount
              maxLength={2000}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item 
            name="paramsNote"
            label={
              <span>
                <strong>参数记录</strong>
                <span style={{ marginLeft: 8, color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                  可选
                </span>
              </span>
            }
          >
            <TextArea
              rows={3}
              placeholder="例如：Steps: 20, CFG: 7.5, Sampler: DPM++ 2M"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <div style={{ 
            padding: '16px', 
            background: '#fff7e6', 
            borderRadius: 4,
            marginBottom: 24,
            border: '1px solid #ffd591'
          }}>
            <div style={{ fontSize: 13, color: '#d46b08' }}>
              ⚠️ 注意：编辑功能目前仅支持修改元数据（标题、类型、工具、模型、提示词、参数记录），不支持修改图片。
            </div>
          </div>

          <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
            <Space size="large">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                size="large"
                style={{ 
                  minWidth: 120,
                  height: 40,
                }}
              >
                保存
              </Button>
              <Button 
                onClick={() => navigate(`/logs/${id}`)}
                size="large"
                style={{ 
                  minWidth: 120,
                  height: 40,
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default EditLogPage

