/**
 * 新建记录页面
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Form,
  Input,
  Radio,
  Button,
  Upload,
  message,
  Card,
  Space,
  Divider,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import TagsInput from '../components/TagsInput'
import { createLog } from '../services/logs'
import { getTools, getModels } from '../services/tags'
import { getRecentTools, saveRecentTool, getRecentModels, saveRecentModel } from '../utils/storage'

const { TextArea } = Input

const CreateLogPage: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [logType, setLogType] = useState<'txt2img' | 'img2img'>('txt2img')
  const [loading, setLoading] = useState(false)
  
  // 标签相关
  const [allTools, setAllTools] = useState<string[]>([])
  const [allModels, setAllModels] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  
  // 文件上传
  const [inputFiles, setInputFiles] = useState<UploadFile[]>([])
  const [outputFiles, setOutputFiles] = useState<UploadFile[]>([])
  const [inputNotes, setInputNotes] = useState<Record<string, string>>({})

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

  // 输入文件上传配置
  const inputUploadProps: UploadProps = {
    listType: 'picture-card',
    fileList: inputFiles,
    onChange: ({ fileList }) => {
      setInputFiles(fileList)
      // 更新备注：只保留当前文件列表中存在的文件的备注
      const currentFileNames = new Set(
        fileList.map(file => file.name).filter(Boolean)
      )
      const notes: Record<string, string> = {}
      
      // 保留现有文件的备注
      currentFileNames.forEach(fileName => {
        if (inputNotes[fileName] !== undefined) {
          notes[fileName] = inputNotes[fileName]
        } else {
          notes[fileName] = ''
        }
      })
      
      setInputNotes(notes)
    },
    beforeUpload: () => false, // 阻止自动上传
    multiple: true,
  }

  // 输出文件上传配置
  const outputUploadProps: UploadProps = {
    listType: 'picture-card',
    fileList: outputFiles,
    onChange: ({ fileList }) => setOutputFiles(fileList),
    beforeUpload: () => false,
    multiple: true,
  }

  // 处理输入文件备注变化
  const handleInputNoteChange = (filename: string, note: string) => {
    setInputNotes({ ...inputNotes, [filename]: note })
  }

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (outputFiles.length === 0) {
      message.error('请至少上传一张输出图片')
      return
    }

    if (logType === 'img2img' && inputFiles.length === 0) {
      message.warning('图生图模式建议上传参考图片，是否继续？')
    }

    setLoading(true)
    try {
      // 保存最近使用的标签
      tools.forEach(saveRecentTool)
      models.forEach(saveRecentModel)

      // 准备文件
      const inputFileList = inputFiles
        .filter(file => file.originFileObj)
        .map(file => file.originFileObj!)
      
      const outputFileList = outputFiles
        .filter(file => file.originFileObj)
        .map(file => file.originFileObj!)

      console.log('提交创建记录:', {
        logType,
        inputFilesCount: inputFileList.length,
        inputFiles: inputFileList.map(f => ({ name: f.name, size: f.size })),
        inputNotes,
        outputFilesCount: outputFileList.length,
      })

      await createLog({
        title: values.title,
        logType: logType,
        tools: tools.length > 0 ? tools : undefined,
        models: models.length > 0 ? models : undefined,
        prompt: values.prompt?.trim() || undefined,
        paramsNote: values.paramsNote?.trim() || undefined,
        inputFiles: inputFileList.length > 0 ? inputFileList : undefined,
        inputNotes: Object.keys(inputNotes).length > 0 ? inputNotes : undefined,
        outputFiles: outputFileList,
      })

      message.success({
        content: '创建成功！',
        duration: 2,
      })
      navigate('/')
    } catch (error: any) {
      console.error('创建失败:', error)
      const errorMessage = error?.message || '创建失败，请检查输入后重试'
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
      <Card 
        title={
          <div style={{ fontSize: 20, fontWeight: 600 }}>
            ✨ 新建记录
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

          <Divider />

          {/* 输入文件上传区（仅 img2img） */}
          {logType === 'img2img' && (
            <>
              <Form.Item 
                label={
                  <span>
                    <strong>原始参考图片</strong>
                    <span style={{ marginLeft: 8, color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                      可选，最多10张
                    </span>
                  </span>
                }
              >
                <Upload {...inputUploadProps}>
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
                            placeholder="输入备注（如：Canny边缘控制）"
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

          {/* 输出文件上传区 */}
          <Form.Item
            label={
              <span>
                <strong>生成结果图片</strong>
                <span style={{ marginLeft: 8, color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                  必填，最多20张
                </span>
              </span>
            }
            required
          >
            <Upload {...outputUploadProps}>
              {outputFiles.length < 20 && (
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
            {outputFiles.length > 0 && (
              <div style={{ 
                marginTop: 8, 
                padding: '8px 12px', 
                background: '#f0f2f5', 
                borderRadius: 4,
                fontSize: 12,
                color: '#666',
              }}>
                已选择 {outputFiles.length} 张图片
              </div>
            )}
          </Form.Item>

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
    </div>
  )
}

export default CreateLogPage

