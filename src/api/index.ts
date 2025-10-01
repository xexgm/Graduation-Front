import axios, { type AxiosResponse, type AxiosRequestConfig } from 'axios'
import type { 
  ApiResponse, 
  LoginForm, 
  RegisterForm, 
  LoginResponse,
  RegisterResponse,
  LogoutRequest,
  ChangePasswordRequest,
  TokenRequest,
  User
} from '@/types'
import { ElMessage } from 'element-plus'

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 环境切换：是否启用本地模拟
const IS_MOCK_AUTH = String(import.meta.env.VITE_ENABLE_MOCK_AUTH) === 'true'

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message } = response.data
    if (code !== 200) {
      ElMessage.error(message || '请求失败')
      if (code === 401) {
        // Token 无效，清除本地存储并跳转到登录页
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
      return Promise.reject(new Error(message))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    } else {
      ElMessage.error(error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

// 用户认证API
export const authApi = {
  // 用户注册
  register: (data: RegisterForm): Promise<ApiResponse<RegisterResponse>> => {
    if (IS_MOCK_AUTH) {
      const now = Date.now()
      const mockUser: User = {
        userId: Math.floor(Math.random() * 100000) + 1000,
        username: data.username,
        nickname: data.nickname || data.username,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.username)}`,
        status: 1,
        createTime: now,
        updateTime: now
      }
      const resp: ApiResponse<RegisterResponse> = {
        code: 200,
        message: 'ok',
        data: mockUser,
        timestamp: now
      }
      return Promise.resolve(resp)
    }
    return api.post('/user/register', data).then(res => res.data)
  },
    
  // 用户登录
  login: (data: LoginForm): Promise<ApiResponse<LoginResponse>> => {
    if (IS_MOCK_AUTH) {
      const now = Date.now()
      const mockToken = `mock-token-${data.username}-${now}`
      const mockUser: User = {
        userId: Math.floor(Math.random() * 100000) + 1,
        username: data.username,
        nickname: data.username,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.username)}`,
        status: 1,
        createTime: now,
        updateTime: now
      }
      const resp: ApiResponse<LoginResponse> = {
        code: 200,
        message: 'ok',
        data: {
          user: mockUser,
          token: mockToken,
          tokenExpireTime: now + 7 * 24 * 60 * 60 * 1000
        },
        timestamp: now
      }
      localStorage.setItem('auth_token', mockToken)
      localStorage.setItem('mock_user', JSON.stringify(mockUser))
      return Promise.resolve(resp)
    }

    return api.post('/user/login', data).then(res => {
      const response = res.data
      if (response.code === 200 && response.data?.token) {
        // 保存 Token 到 localStorage
        localStorage.setItem('auth_token', response.data.token)
      }
      return response
    })
  },
    
  // 用户登出
  logout: (data: LogoutRequest): Promise<ApiResponse<string>> =>
    api.post('/user/logout', data).then(res => {
      localStorage.removeItem('auth_token')
      return res.data
    }),
    
  // 获取用户信息
  getUserInfo: (userId: number): Promise<ApiResponse<User>> => {
    if (IS_MOCK_AUTH) {
      const now = Date.now()
      const saved = localStorage.getItem('mock_user')
      const parsed: User | null = saved ? JSON.parse(saved) : null
      const user: User = parsed || {
        userId,
        username: 'mockuser',
        nickname: 'Mock用户',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=mock` ,
        status: 1,
        createTime: now,
        updateTime: now
      }
      return Promise.resolve({ code: 200, message: 'ok', data: user, timestamp: now })
    }
    return api.get(`/user/${userId}`).then(res => res.data)
  },

  // 验证Token
  validateToken: (data: TokenRequest): Promise<ApiResponse<User>> => {
    if (IS_MOCK_AUTH) {
      const now = Date.now()
      const saved = localStorage.getItem('mock_user')
      const user: User | null = saved ? JSON.parse(saved) : null
      if (user) {
        return Promise.resolve({ code: 200, message: 'ok', data: user, timestamp: now })
      } else {
        return Promise.resolve({ code: 401, message: '未授权', data: null, timestamp: now })
      }
    }
    return api.post('/user/validate-token', data).then(res => res.data)
  },

  // 修改密码
  changePassword: (data: ChangePasswordRequest): Promise<ApiResponse<string>> =>
    api.post('/user/change-password', data).then(res => res.data)
}

// 聊天API
export const chatApi = {
  // 发送消息 (通过WebSocket实现，这里提供占位符方法)
  sendMessage: (roomId: string, content: string): Promise<void> => {
    // 实际发送通过WebSocket进行，这里返回resolved Promise
    return Promise.resolve()
  },

  // 聊天室：查询列表（未删除）
  listChatRooms: (): Promise<ApiResponse<import('@/types').BackendChatRoom[]>> =>
    api.get('/chatroom/list').then(res => res.data),

  // 聊天室：创建（管理员）
  createChatRoom: (data: import('@/types').CreateChatRoomRequest): Promise<ApiResponse<import('@/types').BackendChatRoom>> =>
    api.post('/chatroom/create', data).then(res => res.data),

  // 聊天室：下线（管理员）
  offlineChatRoom: (roomId: number): Promise<ApiResponse<null>> =>
    api.post(`/chatroom/${roomId}/offline`).then(res => res.data),

  // 聊天室：删除（管理员，软删）
  deleteChatRoom: (roomId: number): Promise<ApiResponse<null>> =>
    api.delete(`/chatroom/${roomId}`).then(res => res.data)
}

// 工具方法
export const apiUtils = {
  // 设置Token
  setToken: (token: string) => {
    localStorage.setItem('auth_token', token)
  },

  // 获取Token
  getToken: (): string | null => {
    return localStorage.getItem('auth_token')
  },

  // 清除Token
  clearToken: () => {
    localStorage.removeItem('auth_token')
  },

  // 检查是否已登录
  isLoggedIn: (): boolean => {
    return !!localStorage.getItem('auth_token')
  }
}

export default api
