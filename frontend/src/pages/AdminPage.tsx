/**
 * 管理员后台页面
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Switch,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Spin,
} from 'antd'
import {
  UserOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import {
  getUserList,
  updateUser,
  deleteUser,
  getAdminStats,
  type UserListItem,
  type AdminStats,
} from '../services/admin'
import { getRoles, type Role } from '../services/rbac'

const { Search } = Input
const { Option } = Select

const AdminPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | undefined>()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])

  // 检查是否为管理员（需要 system.admin_panel 权限或 admin 角色）
  useEffect(() => {
    if (!authLoading && (!user || !user.roles.includes('admin'))) {
      message.error('需要管理员权限')
      navigate('/')
    }
  }, [user, authLoading, navigate])

  // 加载角色列表（仅一次）
  useEffect(() => {
    if (user && user.roles.includes('admin')) {
      loadRoles()
    }
  }, [user])

  // 加载用户列表和统计信息
  useEffect(() => {
    if (user && user.roles.includes('admin')) {
      loadUsers()
      loadStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, pageSize, search, roleFilter])
  
  const loadRoles = async () => {
    try {
      const data = await getRoles()
      setAvailableRoles(data)
    } catch (error: unknown) {
      console.error('加载角色列表失败:', error)
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await getUserList(page, pageSize, search || undefined, roleFilter)
      setUsers(response.data)
      setTotal(response.total)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '加载用户列表失败'
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await getAdminStats()
      setStats(data)
    } catch (error: unknown) {
      console.error('加载统计信息失败:', error)
    }
  }

  const handleUpdateUser = async (userId: number, updates: { role_names?: string[]; is_active?: boolean }) => {
    try {
      await updateUser(userId, updates)
      message.success('更新成功')
      loadUsers()
      loadStats()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '更新失败'
      message.error(errorMessage)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteUser(userId)
      message.success('删除成功')
      loadUsers()
      loadStats()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '删除失败'
      message.error(errorMessage)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'red'
      case 'editor':
        return 'blue'
      case 'user':
        return 'default'
      default:
        return 'default'
    }
  }

  const getRoleText = (role: string) => {
    const roleObj = availableRoles.find(r => r.name === role)
    return roleObj ? roleObj.display_name : role
  }

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!user || !user.roles.includes('admin')) {
    return null
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => email || '-',
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => (
        <Space>
          {roles.map(role => (
            <Tag key={role} color={getRoleColor(role)}>
              {getRoleText(role)}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean, record: UserListItem) => (
        <Switch
          checked={isActive}
          onChange={(checked) => {
            if (record.id === user.id) {
              message.warning('不能修改自己的状态')
              return
            }
            handleUpdateUser(record.id, { is_active: checked })
          }}
          disabled={record.id === user.id}
        />
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: UserListItem) => (
        <Space>
          <Select
            mode="multiple"
            value={record.roles}
            onChange={(values) => {
              if (record.id === user.id) {
                message.warning('不能修改自己的角色')
                return
              }
              handleUpdateUser(record.id, { role_names: values })
            }}
            disabled={record.id === user.id}
            style={{ width: 250 }}
            placeholder="选择角色"
          >
            {availableRoles.map(role => (
              <Option key={role.id} value={role.name}>
                {role.display_name}
              </Option>
            ))}
          </Select>
          <Popconfirm
            title="确定要删除这个用户吗？"
            description="此操作不可撤销，用户的所有收藏也会被删除。"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="确定删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            disabled={record.id === user.id}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              disabled={record.id === user.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px' }}>
      {/* 顶部操作栏 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} size="large">
            返回图库
          </Button>
          <div style={{ fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined />
            用户管理
          </div>
        </Space>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => navigate('/admin/roles')}>
            角色权限管理
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => { loadUsers(); loadStats() }}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 统计信息 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="总用户数" value={stats.total_users} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="活跃用户" value={stats.active_users} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="管理员" value={stats.admin_count} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="编辑者" value={stats.editor_count} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
        </Row>
      )}

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Search
            placeholder="搜索用户名或邮箱"
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => {
              setSearch(value)
              setPage(1)
            }}
            enterButton={<SearchOutlined />}
          />
          <Select
            placeholder="筛选角色"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setRoleFilter(value)
              setPage(1)
            }}
          >
            {availableRoles.map(role => (
              <Option key={role.id} value={role.name}>
                {role.display_name}
              </Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* 用户列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage)
              setPageSize(newPageSize)
            },
            onShowSizeChange: (_, newPageSize) => {
              setPage(1)
              setPageSize(newPageSize)
            },
          }}
        />
      </Card>
    </div>
  )
}

export default AdminPage

