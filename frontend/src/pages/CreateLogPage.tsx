/**
 * 新建记录页面
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Form,
  Input,
  Button,
  Upload,
  message,
  Card,
  Space,
  Divider,
  Switch,
} from 'antd'
import { PlusOutlined, MinusCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import TagsInput from '../components/TagsInput'
import PasswordModal from '../components/PasswordModal'
import { createLog } from '../services/logs'
import { getTools, getModels } from '../services/tags'
import { getRecentTools, saveRecentTool, getRecentModels, saveRecentModel } from '../utils/storage'
import { isPasswordVerified } from '../utils/password'

const { TextArea } = Input

const CreateLogPage: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [logType, setLogType] = useState<'txt2img' | 'img2img'>('txt2img')
  const [loading, setLoading] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [isNsfw, setIsNsfw] = useState(false)
  
  // 标签相关
  const [allTools, setAllTools] = useState<string[]>([])
  const [allModels, setAllModels] = useState<string[]>([])
  
  // 输入文件（所有输出组共享）
  const [inputFiles, setInputFiles] = useState<UploadFile[]>([])
  const [inputNotes, setInputNotes] = useState<Record<string, string>>({})
  
  // 输出组：每个组包含工具、模型和输出图片
  interface OutputGroupState {
    id: string  // 临时ID
    tools: string[]
    models: string[]
    outputFiles: UploadFile[]
  }
  const [outputGroups, setOutputGroups] = useState<OutputGroupState[]>([
    { id: '1', tools: [], models: [], outputFiles: [] }
  ])
  

  // 加载标签列表
  useEffect(() => {
    loadTags()
  }, [])

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


  // 处理输入文件备注变化
  const handleInputNoteChange = (filename: string, note: string) => {
    setInputNotes({ ...inputNotes, [filename]: note })
  }

  // 添加输出组
  const addOutputGroup = () => {
    const newId = Date.now().toString()
    setOutputGroups([...outputGroups, { id: newId, tools: [], models: [], outputFiles: [] }])
  }

  // 删除输出组
  const removeOutputGroup = (id: string) => {
    if (outputGroups.length <= 1) {
      message.warning('至少需要保留一个输出组，无法删除')
      return
    }
    setOutputGroups(outputGroups.filter(g => g.id !== id))
  }

  // 更新输出组
  const updateOutputGroup = (id: string, updates: Partial<OutputGroupState>) => {
    setOutputGroups(outputGroups.map(g => g.id === id ? { ...g, ...updates } : g))
  }

  // 提交表单
  const handleSubmit = async (values: any) => {
    // 验证每个输出组都有输出图片
    for (let i = 0; i < outputGroups.length; i++) {
      const group = outputGroups[i]
      const validFiles = group.outputFiles.filter(f => f.originFileObj)
      if (validFiles.length === 0) {
        message.error(`输出组 ${i + 1} 至少需要上传一张生成结果图片`)
        return
      }
    }

    setLoading(true)
    try {
      // 保存最近使用的标签
      outputGroups.forEach(group => {
        group.tools.forEach(saveRecentTool)
        group.models.forEach(saveRecentModel)
      })

      // 准备输入文件
      const inputFileList = inputFiles
        .filter(file => file.originFileObj)
        .map(file => file.originFileObj!)

      // 准备输出组数据
      const outputGroupsData = outputGroups.map(group => ({
        tools: group.tools,
        models: group.models,
        outputFiles: group.outputFiles
          .filter(file => file.originFileObj)
          .map(file => file.originFileObj!)
      }))

      await createLog({
        title: values.title,
        logType: logType,
        prompt: values.prompt?.trim() || undefined,
        paramsNote: values.paramsNote?.trim() || undefined,
        inputFiles: inputFileList.length > 0 ? inputFileList : undefined,
        inputNotes: Object.keys(inputNotes).length > 0 ? inputNotes : undefined,
        outputGroups: outputGroupsData,
        isNsfw: isNsfw,
      })

      message.success({
        content: '记录创建成功！',
        duration: 2,
      })

      // 设置刷新标志，返回首页时自动刷新
      sessionStorage.setItem('refreshHomePage', 'true')
      navigate('/')
    } catch (error: any) {
      console.error('创建失败:', error)
      const errorMessage = error?.message || '创建失败，请检查输入信息后重试'
      message.error({
        content: errorMessage,
        duration: 4,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      {/* 顶部操作栏 */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px 0',
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
          size="large"
          style={{ borderRadius: 8 }}
        >
          返回图库
        </Button>
      </div>

      <Card 
        title={
          <div style={{ fontSize: 20, fontWeight: 600 }}>
            ✨ 创建新记录
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
            label="记录标题"
            name="title"
            rules={[{ required: true, message: '请输入记录标题' }]}
          >
            <Input placeholder="例如：春日公主主题、赛博朋克风格等" />
          </Form.Item>

          <Form.Item
            label="生成类型"
            name="logType"
            initialValue="txt2img"
          >
            <div style={{ display: 'flex', gap: 16 }}>
              <div
                onClick={() => {
                  setLogType('txt2img')
                  form.setFieldsValue({ logType: 'txt2img' })
                }}
                style={{
                  flex: 1,
                  padding: '20px 24px',
                  border: `2px solid ${logType === 'txt2img' ? '#1890ff' : '#d9d9d9'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: logType === 'txt2img' ? '#e6f7ff' : '#fff',
                  transition: 'all 0.3s',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => {
                  if (logType !== 'txt2img') {
                    e.currentTarget.style.borderColor = '#40a9ff'
                    e.currentTarget.style.background = '#f0f9ff'
                  }
                }}
                onMouseLeave={(e) => {
                  if (logType !== 'txt2img') {
                    e.currentTarget.style.borderColor = '#d9d9d9'
                    e.currentTarget.style.background = '#fff'
                  }
                }}
              >
                <div style={{ 
                  fontSize: 18, 
                  fontWeight: 600, 
                  color: logType === 'txt2img' ? '#1890ff' : '#595959',
                  marginBottom: 4
                }}>
                  文生图
                </div>
                <div style={{ 
                  fontSize: 12, 
                  color: '#8c8c8c' 
                }}>
                  Text to Image
                </div>
              </div>
              <div
                onClick={() => {
                  setLogType('img2img')
                  form.setFieldsValue({ logType: 'img2img' })
                }}
                style={{
                  flex: 1,
                  padding: '20px 24px',
                  border: `2px solid ${logType === 'img2img' ? '#1890ff' : '#d9d9d9'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: logType === 'img2img' ? '#e6f7ff' : '#fff',
                  transition: 'all 0.3s',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => {
                  if (logType !== 'img2img') {
                    e.currentTarget.style.borderColor = '#40a9ff'
                    e.currentTarget.style.background = '#f0f9ff'
                  }
                }}
                onMouseLeave={(e) => {
                  if (logType !== 'img2img') {
                    e.currentTarget.style.borderColor = '#d9d9d9'
                    e.currentTarget.style.background = '#fff'
                  }
                }}
              >
                <div style={{ 
                  fontSize: 18, 
                  fontWeight: 600, 
                  color: logType === 'img2img' ? '#1890ff' : '#595959',
                  marginBottom: 4
                }}>
                  图生图
                </div>
                <div style={{ 
                  fontSize: 12, 
                  color: '#8c8c8c' 
                }}>
                  Image to Image
                </div>
              </div>
            </div>
          </Form.Item>


          <Form.Item 
            name="prompt"
            label={
              <span>
                <strong>提示词（Prompt）</strong>
                <span style={{ marginLeft: 8, color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                  可选，用于描述想要生成的图像内容
                </span>
              </span>
            }
          >
            <TextArea
              rows={4}
              placeholder="输入正向提示词，例如：a beautiful princess, spring theme, detailed, 4k..."
              showCount
              maxLength={2000}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item 
            name="paramsNote"
            label={
              <span>
                <strong>生成参数</strong>
                <span style={{ marginLeft: 8, color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                  可选，记录生成时使用的参数设置
                </span>
              </span>
            }
          >
            <TextArea
              rows={3}
              placeholder="例如：Steps: 20, CFG Scale: 7.5, Sampler: DPM++ 2M, Seed: 123456"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            label={
              <span>
                <strong>NSFW 内容标记</strong>
                <span style={{ marginLeft: 8, color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                  (标记为NSFW的内容将自动打码)
                </span>
              </span>
            }
          >
            <Switch
              checked={isNsfw}
              onChange={setIsNsfw}
              checkedChildren="NSFW"
              unCheckedChildren="正常"
            />
          </Form.Item>

          <Divider />

          {/* 输入文件上传区（仅 img2img，所有输出组共享） */}
          {logType === 'img2img' && (
            <>
              <Form.Item 
                label={
                  <span>
                    <strong>参考图片（输入图片）</strong>
                    <span style={{ marginLeft: 8, color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                      可选，图生图模式需要，最多上传 10 张
                    </span>
                  </span>
                }
              >
                <Upload 
                  listType="picture-card"
                  fileList={inputFiles}
                  onChange={({ fileList }) => {
                    setInputFiles(fileList)
                    const currentFileNames = new Set(
                      fileList.map(file => file.name).filter(Boolean)
                    )
                    const notes: Record<string, string> = {}
                    currentFileNames.forEach(fileName => {
                      if (inputNotes[fileName] !== undefined) {
                        notes[fileName] = inputNotes[fileName]
                      } else {
                        notes[fileName] = ''
                      }
                    })
                    setInputNotes(notes)
                  }}
                  beforeUpload={() => false}
                  multiple
                >
                  {inputFiles.length < 10 && (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px 0',
                    }}>
                      <PlusOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                      <div style={{ marginTop: 8, color: '#666' }}>上传图片</div>
                    </div>
                  )}
                </Upload>
                
                {/* 输入备注 */}
                {inputFiles.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    {inputFiles.map((file, index) => (
                      file.name && (
                        <div key={`${file.name}-${file.uid || index}`} style={{ marginBottom: 12 }}>
                          <div style={{ 
                            marginBottom: 4, 
                            fontSize: 12, 
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}>
                            <span style={{ 
                              display: 'inline-block',
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              background: '#1890ff',
                              color: '#fff',
                              textAlign: 'center',
                              lineHeight: '20px',
                              fontSize: 11,
                              flexShrink: 0,
                            }}>
                              {index + 1}
                            </span>
                            <span style={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}>
                              {file.name}
                            </span>
                          </div>
                          <Input
                            placeholder="为这张图片添加备注说明（如：Canny 边缘控制、深度图等）"
                            value={inputNotes[file.name] || ''}
                            onChange={(e) => handleInputNoteChange(file.name, e.target.value)}
                          />
                        </div>
                      )
                    ))}
                  </div>
                )}
              </Form.Item>
              <Divider />
            </>
          )}

          {/* 输出组列表 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 16 
            }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  输出组（共 {outputGroups.length} 个）
                </span>
                <span style={{ marginLeft: 8, color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                  每个输出组代表一个工具/模型组合及其生成的图片结果
                </span>
              </div>
              <Button 
                type="dashed" 
                icon={<PlusOutlined />} 
                onClick={addOutputGroup}
              >
                添加输出组
              </Button>
            </div>
            
            {outputGroups.map((group, index) => (
              <Card
                key={group.id}
                title={`输出组 ${index + 1}`}
                extra={
                  outputGroups.length > 1 && (
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => removeOutputGroup(group.id)}
                    >
                      删除
                    </Button>
                  )
                }
                style={{ marginBottom: 16 }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <Form.Item label="使用的工具">
                    <TagsInput
                      value={group.tools}
                      onChange={(tools) => updateOutputGroup(group.id, { tools })}
                      placeholder="输入工具名称，如：Stable Diffusion WebUI、ComfyUI 等"
                      recentTags={getRecentTools()}
                      allTags={allTools}
                    />
                  </Form.Item>

                  <Form.Item label="使用的模型">
                    <TagsInput
                      value={group.models}
                      onChange={(models) => updateOutputGroup(group.id, { models })}
                      placeholder="输入模型名称，如：SDXL 1.0、LoRA 模型等"
                      recentTags={getRecentModels()}
                      allTags={allModels}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        <strong>生成结果图片</strong>
                        <span style={{ marginLeft: 8, color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                          必填，每个输出组至少上传 1 张，最多 20 张
                        </span>
                      </span>
                    }
                    required
                  >
                    <Upload
                      listType="picture-card"
                      fileList={group.outputFiles}
                      onChange={({ fileList }) => updateOutputGroup(group.id, { outputFiles: fileList })}
                      beforeUpload={() => false}
                      multiple
                    >
                      {group.outputFiles.length < 20 && (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '20px 0',
                        }}>
                          <PlusOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                          <div style={{ marginTop: 8, color: '#666' }}>上传图片</div>
                        </div>
                      )}
                    </Upload>
                    {group.outputFiles.length > 0 && (
                      <div style={{ 
                        marginTop: 8, 
                        padding: '8px 12px', 
                        background: '#f0f2f5', 
                        borderRadius: 4,
                        fontSize: 12,
                        color: '#666',
                      }}>
                        已选择 {group.outputFiles.length} 张图片
                      </div>
                    )}
                  </Form.Item>
                </Space>
              </Card>
            ))}
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
                onClick={() => navigate('/')}
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
      
      <PasswordModal
        open={showPasswordModal}
        onSuccess={() => setShowPasswordModal(false)}
        onCancel={() => navigate('/')}
      />
    </div>
  )
}

export default CreateLogPage

