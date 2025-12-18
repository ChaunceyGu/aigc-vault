/**
 * 角色权限管理页面
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Modal,
  Form,
  Checkbox,
  message,
  Popconfirm,
  Divider,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import {
  getRoles,
  getPermissions,
  createRole,
  updateRole,
  deleteRole,
  type Role,
  type Permission,
  type RoleCreateRequest,
  type RoleUpdateRequest,
} from '../services/rbac'

const { TextArea } = Input

const RoleManagePage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [permissionsByCategory, setPermissionsByCategory] = useState<Record<string, Permission[]>>({})
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form] = Form.useForm()

  // 检查权限
  useEffect(() => {
    if (!user || !user.roles.includes('admin')) {
      message.error('需要管理员权限')
      navigate('/')
    }
  }, [user, navigate])

  // 加载数据
  useEffect(() => {
    if (user && user.roles.includes('admin')) {
      loadRoles()
      loadPermissions()
    }
  }, [user])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const data = await getRoles()
      setRoles(data)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '加载角色列表失败'
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      const data = await getPermissions()
      setPermissions(data)
      
      // 按分类组织权限
      const byCategory: Record<string, Permission[]> = {}
      data.forEach(perm => {
        if (!byCategory[perm.category]) {
          byCategory[perm.category] = []
        }
        byCategory[perm.category].push(perm)
      })
      setPermissionsByCategory(byCategory)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '加载权限列表失败'
      message.error(errorMessage)
    }
  }

  const handleCreate = () => {
    setEditingRole(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    form.setFieldsValue({
      name: role.name,
      display_name: role.display_name,
      description: role.description,
      permission_names: role.permissions,
    })
    setModalVisible(true)
  }

  const handleDelete = async (roleId: number) => {
    try {
      await deleteRole(roleId)
      message.success('删除成功')
      loadRoles()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '删除失败'
      message.error(errorMessage)
    }
  }

  const handleSubmit = async (values: {
    name?: string
    display_name: string
    description?: string
    permission_names?: string[]
  }) => {
    try {
      if (editingRole) {
        const updateData: RoleUpdateRequest = {
          display_name: values.display_name,
          description: values.description,
          permission_names: values.permission_names || [],
        }
        await updateRole(editingRole.id, updateData)
        message.success('更新成功')
      } else {
        if (!values.name) {
          message.error('角色名称不能为空')
          return
        }
        const createData: RoleCreateRequest = {
          name: values.name,
          display_name: values.display_name,
          description: values.description,
          permission_names: values.permission_names || [],
        }
        await createRole(createData)
        message.success('创建成功')
      }
      setModalVisible(false)
      form.resetFields()
      loadRoles()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '操作失败'
      message.error(errorMessage)
    }
  }

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      log: '记录管理',
      user: '用户管理',
      role: '角色权限',
      system: '系统管理',
    }
    return names[category] || category
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '显示名称',
      dataIndex: 'display_name',
      key: 'display_name',
    },
    {
      title: '系统角色',
      dataIndex: 'is_system',
      key: 'is_system',
      render: (isSystem: boolean) => (
        <Tag color={isSystem ? 'red' : 'default'}>
          {isSystem ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (perms: string[]) => perms.length,
    },
    {
      title: '权限列表',
      dataIndex: 'permissions',
      key: 'permissions_list',
      render: (perms: string[]) => {
        // 根据权限名称查找对应的权限对象，获取中文显示名称
        const getPermissionDisplayName = (permName: string) => {
          const perm = permissions.find(p => p.name === permName)
          return perm ? perm.display_name : permName
        }
        
        return (
          <Space wrap size={[4, 4]}>
            {perms.slice(0, 5).map(perm => (
              <Tag key={perm} color="blue" style={{ margin: 0 }}>
                {getPermissionDisplayName(perm)}
              </Tag>
            ))}
            {perms.length > 5 && (
              <Tag color="default" style={{ margin: 0 }}>
                +{perms.length - 5}
              </Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Role) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={record.is_system}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个角色吗？"
            description="此操作不可撤销，使用此角色的用户将失去相关权限。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            disabled={record.is_system}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              disabled={record.is_system}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (!user || !user.roles.includes('admin')) {
    return null
  }

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px' }}>
      {/* 顶部操作栏 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin')} size="large">
            返回用户管理
          </Button>
          <div style={{ fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingOutlined />
            角色权限管理
          </div>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建角色
        </Button>
      </div>

      {/* 角色列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* 创建/编辑角色模态框 */}
      <Modal
        title={editingRole ? '编辑角色' : '创建角色'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {!editingRole && (
            <Form.Item
              name="name"
              label="角色名称"
              rules={[
                { required: true, message: '请输入角色名称' },
                { pattern: /^[a-z0-9_]+$/, message: '角色名称只能包含小写字母、数字和下划线' }
              ]}
            >
              <Input placeholder="例如: content_manager" />
            </Form.Item>
          )}
          
          <Form.Item
            name="display_name"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="例如: 内容管理员" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="角色描述" />
          </Form.Item>

          <Form.Item
            name="permission_names"
            label="权限"
          >
            <Checkbox.Group style={{ width: '100%' }}>
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category} style={{ marginBottom: 16 }}>
                  <Divider orientation="left">{getCategoryName(category)}</Divider>
                  <Space wrap>
                    {perms.map(perm => (
                      <Checkbox key={perm.name} value={perm.name}>
                        {perm.display_name}
                        <span style={{ color: '#999', marginLeft: 4 }}>
                          ({perm.name})
                        </span>
                      </Checkbox>
                    ))}
                  </Space>
                </div>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RoleManagePage

