/**
 * 登录/注册页面
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, message, Tabs, Space } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { getCaptcha, type CaptchaResponse } from '../services/auth'

const { TabPane } = Tabs

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const [loginCaptcha, setLoginCaptcha] = useState<CaptchaResponse | null>(null)
  const [registerCaptcha, setRegisterCaptcha] = useState<CaptchaResponse | null>(null)
  const [loginCaptchaLoading, setLoginCaptchaLoading] = useState(false)
  const [registerCaptchaLoading, setRegisterCaptchaLoading] = useState(false)

  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()

  // 加载登录验证码
  const loadLoginCaptcha = async () => {
    setLoginCaptchaLoading(true)
    try {
      const data = await getCaptcha()
      setLoginCaptcha(data)
      loginForm.setFieldsValue({ captcha_id: data.captcha_id })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '获取验证码失败'
      message.error(errorMessage)
    } finally {
      setLoginCaptchaLoading(false)
    }
  }

  // 加载注册验证码
  const loadRegisterCaptcha = async () => {
    setRegisterCaptchaLoading(true)
    try {
      const data = await getCaptcha()
      setRegisterCaptcha(data)
      registerForm.setFieldsValue({ captcha_id: data.captcha_id })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '获取验证码失败'
      message.error(errorMessage)
    } finally {
      setRegisterCaptchaLoading(false)
    }
  }

  // 切换标签时加载对应的验证码
  useEffect(() => {
    if (activeTab === 'login' && !loginCaptcha) {
      loadLoginCaptcha()
    } else if (activeTab === 'register' && !registerCaptcha) {
      loadRegisterCaptcha()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleLogin = async (values: { 
    username: string
    password: string
    captcha_id: string
    captcha_answer: string
  }) => {
    setLoginLoading(true)
    try {
      await login(
        values.username, 
        values.password,
        values.captcha_id,
        values.captcha_answer
      )
      message.success('登录成功')
      navigate('/')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '登录失败，请检查用户名和密码'
      message.error(errorMessage)
      // 验证码错误时刷新验证码
      if (errorMessage.includes('验证码')) {
        loadLoginCaptcha()
        loginForm.setFieldsValue({ captcha_answer: '' })
      }
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (values: { 
    username: string
    password: string
    email?: string
    captcha_id: string
    captcha_answer: string
  }) => {
    setRegisterLoading(true)
    try {
      await register(
        values.username, 
        values.password, 
        values.email,
        values.captcha_id,
        values.captcha_answer
      )
      message.success('注册成功')
      navigate('/')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '注册失败，请重试'
      message.error(errorMessage)
      // 验证码错误时刷新验证码
      if (errorMessage.includes('验证码')) {
        loadRegisterCaptcha()
        registerForm.setFieldsValue({ captcha_answer: '' })
      }
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 200px)',
      padding: '24px'
    }}>
      <Card
        title="用户登录"
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
          <TabPane tab="登录" key="login">
            <Form
              form={loginForm}
              name="login"
              onFinish={handleLogin}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少需要 3 个字符' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少需要 6 个字符' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                />
              </Form.Item>

              <Form.Item
                name="captcha_id"
                hidden
              >
                <Input type="hidden" />
              </Form.Item>

              <Form.Item
                label={
                  <span>
                    验证码
                    {loginCaptcha && (
                      <span style={{ marginLeft: 8, color: '#1890ff', fontWeight: 500 }}>
                        {loginCaptcha.question}
                      </span>
                    )}
                  </span>
                }
                name="captcha_answer"
                rules={[
                  { required: true, message: '请输入验证码答案' },
                  {
                    pattern: /^-?\d+$/,
                    message: '验证码答案必须是数字'
                  }
                ]}
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="请输入计算结果"
                    disabled={!loginCaptcha || loginCaptchaLoading}
                    style={{ flex: 1 }}
                    onPressEnter={() => loginForm.submit()}
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={loadLoginCaptcha}
                    loading={loginCaptchaLoading}
                    title="刷新验证码"
                  >
                    刷新
                  </Button>
                </Space.Compact>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loginLoading}
                  disabled={!loginCaptcha}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="注册" key="register">
            <Form
              form={registerForm}
              name="register"
              onFinish={handleRegister}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少需要 3 个字符' },
                  { max: 50, message: '用户名不能超过 50 个字符' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="邮箱（可选）"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少需要 6 个字符' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="确认密码"
                />
              </Form.Item>

              <Form.Item
                name="captcha_id"
                hidden
              >
                <Input type="hidden" />
              </Form.Item>

              <Form.Item
                label={
                  <span>
                    验证码
                    {registerCaptcha && (
                      <span style={{ marginLeft: 8, color: '#1890ff', fontWeight: 500 }}>
                        {registerCaptcha.question}
                      </span>
                    )}
                  </span>
                }
                name="captcha_answer"
                rules={[
                  { required: true, message: '请输入验证码答案' },
                  {
                    pattern: /^-?\d+$/,
                    message: '验证码答案必须是数字'
                  }
                ]}
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="请输入计算结果"
                    disabled={!registerCaptcha || registerCaptchaLoading}
                    style={{ flex: 1 }}
                    onPressEnter={() => registerForm.submit()}
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={loadRegisterCaptcha}
                    loading={registerCaptchaLoading}
                    title="刷新验证码"
                  >
                    刷新
                  </Button>
                </Space.Compact>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={registerLoading}
                  disabled={!registerCaptcha}
                >
                  注册
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

