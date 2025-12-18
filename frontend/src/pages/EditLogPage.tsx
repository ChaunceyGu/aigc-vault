/**
 * 编辑记录页面
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Form,
  Input,
  Button,
  message,
  Card,
  Space,
  Spin,
  Divider,
  Upload,
  Tag,
  Popconfirm,
  Switch,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import TagsInput from '../components/TagsInput'
import { updateLog, getLogDetail, addOutputGroup, updateOutputGroup, deleteOutputGroup, type LogDetail } from '../services/logs'
import { getTools, getModels } from '../services/tags'
import { getRecentTools, saveRecentTool, getRecentModels, saveRecentModel } from '../utils/storage'
import { smartCompress } from '../utils/imageCompress'

const { TextArea } = Input

const EditLogPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [logType, setLogType] = useState<'txt2img' | 'img2img'>('txt2img')
  const [loading, setLoading] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [logDetail, setLogDetail] = useState<LogDetail | null>(null)
  const [isNsfw, setIsNsfw] = useState(false)
  
  // 标签相关
  const [allTools, setAllTools] = useState<string[]>([])
  const [allModels, setAllModels] = useState<string[]>([])
  
  // 现有输出组（从详情加载）
  const [existingOutputGroups, setExistingOutputGroups] = useState<Array<{
    id: number | null  // 可能是null（旧数据）
    tools: string[]
    models: string[]
    assets: Array<{ id: number; url: string; file_key: string }>
  }>>([])
  
  // 编辑中的输出组ID
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  
  // 添加输出组
  const [addingOutputGroup, setAddingOutputGroup] = useState(false)
  const [newGroupTools, setNewGroupTools] = useState<string[]>([])
  const [newGroupModels, setNewGroupModels] = useState<string[]>([])
  const [newGroupFiles, setNewGroupFiles] = useState<UploadFile[]>([])
  
  // 编辑输出组的状态
  const [editingGroupTools, setEditingGroupTools] = useState<string[]>([])
  const [editingGroupModels, setEditingGroupModels] = useState<string[]>([])
  const [editingGroupNewFiles, setEditingGroupNewFiles] = useState<UploadFile[]>([])
  const [editingGroupRemoveAssetIds, setEditingGroupRemoveAssetIds] = useState<number[]>([])

  // 移除页面加载时的密码验证，改为在点击按钮时验证

  // 加载记录详情和标签列表
  useEffect(() => {
    if (id) {
      loadDetail()
      loadTags()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadDetail = async (forceRefresh = false) => {
    if (!id) return
    setLoadingDetail(true)
    try {
      // 强制刷新时添加时间戳参数来绕过缓存
      const data = await getLogDetail(Number(id), forceRefresh)
      setLogDetail(data)
      setLogType(data.log_type as 'txt2img' | 'img2img')
      setIsNsfw(data.is_nsfw || false)
      
      // 保存输出组数据（包括所有输出组，包括id为null的旧数据）
      console.log('详情数据:', data)
      if (data.output_groups && Array.isArray(data.output_groups) && data.output_groups.length > 0) {
        // 显示所有输出组，包括旧数据（id为null的）
        // 确保每个输出组都有assets数组
        const groupsWithAssets = data.output_groups.map((g) => ({
          ...g,
          assets: g.assets || []  // 确保assets存在，默认为空数组
        }))
        setExistingOutputGroups(groupsWithAssets)
        console.log('加载的输出组:', groupsWithAssets, '总数:', groupsWithAssets.length)
        groupsWithAssets.forEach((g, idx: number) => {
          console.log(`输出组 ${idx + 1}:`, {
            id: g.id,
            tools: g.tools,
            models: g.models,
            assetsCount: g.assets ? g.assets.length : 0,
            assets: g.assets
          })
        })
      } else {
        setExistingOutputGroups([])
        console.log('没有输出组数据或数据格式不正确:', data.output_groups)
      }
      
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

  // 添加输出组
  const handleAddOutputGroup = async () => {
    if (!id) return
    
    if (newGroupFiles.length === 0) {
      message.error('请至少上传一张生成结果图片')
      return
    }
    
    setLoading(true)
    try {
      // 压缩图片
      message.loading({ content: '正在压缩图片...', key: 'compress', duration: 0 })
      const compressedFiles: File[] = []
      for (const file of newGroupFiles) {
        if (file.originFileObj) {
          try {
            const compressed = await smartCompress(file.originFileObj, {
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.85
            })
            compressedFiles.push(compressed)
          } catch (error) {
            console.warn('压缩失败，使用原文件:', error)
            compressedFiles.push(file.originFileObj)
          }
        }
      }
      message.destroy('compress')
      
      await addOutputGroup(Number(id), {
        tools: newGroupTools.length > 0 ? newGroupTools : undefined,
        models: newGroupModels.length > 0 ? newGroupModels : undefined,
        outputFiles: compressedFiles,
      })
      
      // 保存最近使用的标签
      newGroupTools.forEach(saveRecentTool)
      newGroupModels.forEach(saveRecentModel)
      
      message.success('输出组添加成功！')
      // 重置表单
      setNewGroupTools([])
      setNewGroupModels([])
      setNewGroupFiles([])
      setAddingOutputGroup(false)
      // 重新加载详情（强制刷新，确保获取最新数据）
      await loadDetail(true)
      // 滚动到新添加的输出组位置
      setTimeout(() => {
        const newGroupElement = document.querySelector(`[data-group-id]`)
        if (newGroupElement) {
          newGroupElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 300)
    } catch (error: unknown) {
      console.error('添加输出组失败:', error)
      const errorMessage = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '添加输出组失败，请重试'
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 开始编辑输出组
  const startEditGroup = (group: { id: number | null; tools?: string[]; models?: string[] }) => {
    if (group.id === null || group.id === undefined) {
      message.warning('旧数据格式无法编辑，请添加新输出组并迁移数据')
      return
    }
    if (typeof group.id !== 'number') {
      message.warning('无法编辑此输出组')
      return
    }
    setEditingGroupId(group.id)
    // 确保tools和models是数组格式
    const tools = Array.isArray(group.tools) ? group.tools : (group.tools ? [group.tools] : [])
    const models = Array.isArray(group.models) ? group.models : (group.models ? [group.models] : [])
    console.log('开始编辑输出组:', {
      id: group.id,
      tools: tools,
      models: models,
      originalTools: group.tools,
      originalModels: group.models,
    })
    setEditingGroupTools(tools)
    setEditingGroupModels(models)
    setEditingGroupNewFiles([])
    setEditingGroupRemoveAssetIds([])
  }

  // 取消编辑输出组
  const cancelEditGroup = () => {
    setEditingGroupId(null)
    setEditingGroupTools([])
    setEditingGroupModels([])
    setEditingGroupNewFiles([])
    setEditingGroupRemoveAssetIds([])
  }

  // 更新输出组
  const handleUpdateOutputGroup = async (groupId: number) => {
    if (!id) return
    
    setLoading(true)
    try {
      // 提取新上传的文件
      // 注意：Ant Design Upload组件的fileList中，文件可能是File对象或UploadFile对象
      // 需要检查是否有originFileObj，如果没有则直接使用file本身
      const fileList = editingGroupNewFiles
        .map(file => {
          // 如果是File对象，直接使用
          if (file instanceof File) {
            return file
          }
          // 如果是UploadFile对象，检查originFileObj
          if (file.originFileObj) {
            return file.originFileObj
          }
          // 如果都没有，尝试使用file本身（可能是File对象）
          return file as unknown as File
        })
        .filter((file): file is File => file instanceof File)
      
      console.log('更新输出组 - editingGroupNewFiles:', editingGroupNewFiles)
      console.log('更新输出组 - 新文件数量:', fileList.length, '文件列表:', fileList.map(f => f.name))
      console.log('更新输出组 - 删除的图片ID:', editingGroupRemoveAssetIds)
      
      if (fileList.length === 0 && editingGroupRemoveAssetIds.length === 0) {
        message.warning('请至少添加新图片或删除现有图片')
        setLoading(false)
        return
      }
      
      // 压缩新上传的图片
      let compressedFiles: File[] | undefined = undefined
      if (fileList.length > 0) {
        message.loading({ content: '正在压缩图片...', key: 'compress-update', duration: 0 })
        compressedFiles = []
        for (const file of fileList) {
          try {
            const compressed = await smartCompress(file, {
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.85
            })
            compressedFiles.push(compressed)
          } catch (error) {
            console.warn('压缩失败，使用原文件:', error)
            compressedFiles.push(file)
          }
        }
        message.destroy('compress-update')
      }
      
      await updateOutputGroup(Number(id), groupId, {
        tools: editingGroupTools,
        models: editingGroupModels,
        outputFiles: compressedFiles,  // 使用压缩后的文件
        removeAssetIds: editingGroupRemoveAssetIds.length > 0 ? editingGroupRemoveAssetIds : undefined,  // 如果没有删除，不传递
      })

      message.success('输出组更新成功！')
      // 重新加载详情（强制刷新，确保获取最新数据）
      await loadDetail(true)
      // 取消编辑状态
      cancelEditGroup()
    } catch (error: unknown) {
      console.error('更新输出组失败:', error)
      const errorMessage = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '更新输出组失败，请重试'
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 删除输出组
  const handleDeleteOutputGroup = async (groupId: number) => {
    if (!id) return
    
    setLoading(true)
    try {
      await deleteOutputGroup(Number(id), groupId)
      message.success('输出组删除成功！')
      // 重新加载详情（强制刷新，确保获取最新数据）
      await loadDetail(true)
    } catch (error: unknown) {
      console.error('删除输出组失败:', error)
      const errorMessage = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '删除输出组失败，请重试'
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 提交表单
  const handleSubmit = async (values: {
    title: string
    prompt?: string
    paramsNote?: string
  }) => {
    if (!id) return

    setLoading(true)
    try {
      await updateLog(Number(id), {
        title: values.title,
        logType: logType,
        prompt: values.prompt?.trim() || undefined,
        paramsNote: values.paramsNote?.trim() || undefined,
        isNsfw: isNsfw,
      })

      message.success('记录更新成功！')
      // 设置刷新标志，返回首页时自动刷新
      sessionStorage.setItem('refreshHomePage', 'true')
      navigate(`/logs/${id}`)
    } catch (error: unknown) {
      console.error('更新失败:', error)
      const errorMessage = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '更新失败，请重试'
      message.error(errorMessage)
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
            ✏️ 编辑记录信息
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

          {/* 工具和模型现在在输出组中，编辑时只能添加新的输出组 */}

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
          
          {/* 现有输出组 */}
          {existingOutputGroups.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ 
                fontSize: 16, 
                fontWeight: 600, 
                marginBottom: 16 
              }}>
                已有输出组（共 {existingOutputGroups.length} 个）
              </div>
              
              {existingOutputGroups.map((group, index) => {
                const isLegacy = group.id === null || group.id === undefined
                const groupKey = group.id !== null && group.id !== undefined ? group.id : `legacy_${index}`
                
                return (
                <Card
                  key={groupKey}
                  title={`输出组 ${index + 1}${isLegacy ? '（旧数据格式，无法编辑）' : ''}`}
                  extra={
                    <Space>
                      {editingGroupId !== group.id && (
                        <>
                          {!isLegacy && typeof group.id === 'number' && (
                            <>
                              <Button
                                type="link"
                                size="small"
                                onClick={() => startEditGroup(group)}
                              >
                                编辑
                              </Button>
                              <Popconfirm
                                title="确定要删除这个输出组吗？"
                                description="此操作不可撤销，组内的所有图片也会被永久删除。"
                                onConfirm={() => handleDeleteOutputGroup(group.id as number)}
                                okText="确定删除"
                                cancelText="取消"
                              >
                                <Button
                                  type="link"
                                  danger
                                  size="small"
                                >
                                  删除
                                </Button>
                              </Popconfirm>
                            </>
                          )}
                          {isLegacy && (
                            <span style={{ fontSize: 12, color: '#999' }}>
                              旧数据格式，无法编辑。如需修改，请添加新的输出组。
                            </span>
                          )}
                        </>
                      )}
                    </Space>
                  }
                  style={{ marginBottom: 16 }}
                >
                  {editingGroupId === group.id ? (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                      <Form.Item label="使用的工具">
                        <TagsInput
                          value={editingGroupTools}
                          onChange={setEditingGroupTools}
                          placeholder="输入工具名称，如：Stable Diffusion WebUI、ComfyUI 等"
                          recentTags={getRecentTools()}
                          allTags={allTools}
                        />
                      </Form.Item>

                      <Form.Item label="使用的模型">
                        <TagsInput
                          value={editingGroupModels}
                          onChange={setEditingGroupModels}
                          placeholder="输入模型名称，如：SDXL 1.0、LoRA 模型等"
                          recentTags={getRecentModels()}
                          allTags={allModels}
                        />
                      </Form.Item>

                      <Form.Item label="现有图片">
                        {group.assets && group.assets.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {group.assets
                              .filter(asset => !editingGroupRemoveAssetIds.includes(asset.id))
                              .map(asset => (
                                <div
                                  key={asset.id}
                                  style={{
                                    position: 'relative',
                                    width: 100,
                                    height: 100,
                                    border: '1px solid #d9d9d9',
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#1890ff'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#d9d9d9'
                                  }}
                                >
                                  <img
                                    src={asset.url}
                                    alt="输出图片"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                    }}
                                  />
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    style={{
                                      position: 'absolute',
                                      top: 2,
                                      right: 2,
                                      background: 'rgba(255, 255, 255, 0.9)',
                                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                    }}
                                    onClick={() => {
                                      setEditingGroupRemoveAssetIds([
                                        ...editingGroupRemoveAssetIds,
                                        asset.id
                                      ])
                                    }}
                                  />
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div style={{ color: '#999', padding: '16px 0' }}>
                            暂无图片
                          </div>
                        )}
                        {editingGroupRemoveAssetIds.length > 0 && (
                          <div style={{ marginTop: 8, color: '#ff4d4f', fontSize: 12 }}>
                            已标记删除 {editingGroupRemoveAssetIds.length} 张图片（点击保存后生效）
                          </div>
                        )}
                      </Form.Item>

                      <Form.Item label="添加新图片">
                        <Upload
                          listType="picture-card"
                          fileList={editingGroupNewFiles}
                          onChange={({ fileList }) => setEditingGroupNewFiles(fileList)}
                          beforeUpload={() => false}
                          multiple
                        >
                          {editingGroupNewFiles.length < 20 && (
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
                      </Form.Item>

                      {/* 保存和取消按钮 - 放在表单底部，更显眼 */}
                      <div style={{ 
                        marginTop: 24, 
                        paddingTop: 16, 
                        borderTop: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 12,
                      }}>
                        <Button
                          size="large"
                          onClick={cancelEditGroup}
                        >
                          取消
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          onClick={() => {
                            if (!isLegacy && typeof group.id === 'number') {
                              handleUpdateOutputGroup(group.id)
                            }
                          }}
                          loading={loading}
                          disabled={isLegacy}
                        >
                          保存
                        </Button>
                      </div>
                    </Space>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      {group.tools.length > 0 && (
                        <div>
                          <span style={{ fontWeight: 600, marginRight: 8 }}>工具:</span>
                          <Space size="small" wrap>
                            {group.tools.map(tool => (
                              <Tag key={tool}>{tool}</Tag>
                            ))}
                          </Space>
                        </div>
                      )}

                      {group.models.length > 0 && (
                        <div>
                          <span style={{ fontWeight: 600, marginRight: 8 }}>模型:</span>
                          <Space size="small" wrap>
                            {group.models.map(model => (
                              <Tag key={model} color="purple">{model}</Tag>
                            ))}
                          </Space>
                        </div>
                      )}

                      <div>
                        <span style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                          图片 ({group.assets && group.assets.length > 0 ? group.assets.length : 0} 张):
                        </span>
                        {group.assets && group.assets.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {group.assets.map(asset => (
                              <div
                                key={asset.id}
                                style={{
                                  position: 'relative',
                                  width: 100,
                                  height: 100,
                                  border: '1px solid #d9d9d9',
                                  borderRadius: 4,
                                  overflow: 'hidden',
                                }}
                              >
                                <img
                                  src={asset.url}
                                  alt="输出图片"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: '#999', padding: '16px 0' }}>
                            暂无图片
                          </div>
                        )}
                      </div>
                    </Space>
                  )}
                </Card>
              )
              })}
            </div>
          ) : (
            <div style={{ 
              padding: '24px', 
              textAlign: 'center', 
              color: '#999',
              marginBottom: 24 
            }}>
              当前没有输出组，请在下方添加新的输出组
            </div>
          )}

          <Divider />
          
          {/* 添加输出组 */}
          <Card
            title={
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                添加新输出组
                <span style={{ marginLeft: 8, color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                  为当前记录添加新的工具/模型组合及其生成的图片
                </span>
              </div>
            }
            style={{ marginBottom: 24 }}
          >
            {!addingOutputGroup ? (
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => setAddingOutputGroup(true)}
                block
                style={{ height: 48 }}
              >
                添加新的输出组
              </Button>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Form.Item label="使用的工具">
                  <TagsInput
                    value={newGroupTools}
                    onChange={setNewGroupTools}
                    placeholder="输入工具名称，如：Stable Diffusion WebUI、ComfyUI 等"
                    recentTags={getRecentTools()}
                    allTags={allTools}
                  />
                </Form.Item>

                <Form.Item label="使用的模型">
                  <TagsInput
                    value={newGroupModels}
                    onChange={setNewGroupModels}
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
                          必填，至少上传 1 张，最多 20 张
                        </span>
                      </span>
                    }
                    required
                >
                  <Upload
                    listType="picture-card"
                    fileList={newGroupFiles}
                    onChange={({ fileList }) => setNewGroupFiles(fileList)}
                    beforeUpload={() => false}
                    multiple
                  >
                    {newGroupFiles.length < 20 && (
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
                </Form.Item>

                <Space>
                  <Button
                    type="primary"
                    onClick={handleAddOutputGroup}
                    loading={loading}
                  >
                    添加输出组
                  </Button>
                  <Button
                    onClick={() => {
                      setAddingOutputGroup(false)
                      setNewGroupTools([])
                      setNewGroupModels([])
                      setNewGroupFiles([])
                    }}
                  >
                    取消
                  </Button>
                </Space>
              </Space>
            )}
          </Card>


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

