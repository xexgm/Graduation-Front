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
  User,
  UploadFileInfo,
  AdminApplication,
  AdminApplicationRequest,
  FriendRequest,
  FriendRequestCreateRequest,
  FriendRequestRejectRequest,
  PrivateReadRequest,
  PrivateUnreadCount,
  VoiceTranscribeRequest,
  VoiceTranscribeResponse
} from '@/types'
import { ElMessage } from 'element-plus'

const TOKEN_STORAGE_KEY = 'auth_token'
let runtimeToken = ''

if (typeof window !== 'undefined') {
  runtimeToken = sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY) || ''
}

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
    const token = runtimeToken || sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
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
    if (response.config.responseType === 'blob') {
      return response
    }

    const { code, message } = response.data
    if (code !== 200) {
      ElMessage.error(message || '请求失败')
      if (code === 401) {
        // Token 无效，清除本地存储并跳转到登录页
        apiUtils.clearToken()
        window.location.href = '/login'
      }
      return Promise.reject(new Error(message))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      apiUtils.clearToken()
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
      apiUtils.setToken(mockToken)
      localStorage.setItem('mock_user', JSON.stringify(mockUser))
      return Promise.resolve(resp)
    }

    return api.post('/user/login', data).then(res => {
      const response = res.data
      if (response.code === 200 && response.data?.token) {
        apiUtils.setToken(response.data.token)
      }
      return response
    })
  },
    
  // 用户登出
  logout: (data: LogoutRequest): Promise<ApiResponse<string>> =>
    api.post('/user/logout', data).then(res => {
      apiUtils.clearToken()
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
    api.delete(`/chatroom/${roomId}`).then(res => res.data),

  // 聊天室：获取在线人数
  getRoomOnlineCount: (roomId: number): Promise<ApiResponse<number>> =>
    api.get(`/chatroom/${roomId}/count`).then(res => res.data)
}

// 好友与私聊API
export const friendApi = {
  // 添加好友
  addFriend: (friendId: number, userId: number): Promise<ApiResponse<null>> => 
    api.post('/friend/add', { userId, friendId }).then(res => res.data),

  // 删除好友
  removeFriend: (friendId: number, userId: number): Promise<ApiResponse<null>> => 
    api.delete(`/friend/remove/${friendId}?userId=${userId}`).then(res => res.data),

  // 获取好友列表
  getFriendList: (userId: number): Promise<ApiResponse<import('@/types').Friend[]>> => 
    api.get(`/friend/list?userId=${userId}`).then(res => res.data)
}

export const friendRequestApi = {
  send: (data: FriendRequestCreateRequest): Promise<ApiResponse<FriendRequest>> =>
    api.post('/friend/request', data).then(res => res.data),

  getReceived: (status?: number): Promise<ApiResponse<FriendRequest[]>> =>
    api.get('/friend/request/received', { params: status === undefined ? undefined : { status } }).then(res => res.data),

  getSent: (): Promise<ApiResponse<FriendRequest[]>> =>
    api.get('/friend/request/sent').then(res => res.data),

  accept: (id: number): Promise<ApiResponse<null>> =>
    api.post(`/friend/request/${id}/accept`).then(res => res.data),

  reject: (id: number, data: FriendRequestRejectRequest = {}): Promise<ApiResponse<null>> =>
    api.post(`/friend/request/${id}/reject`, data).then(res => res.data),

  cancel: (id: number): Promise<ApiResponse<null>> =>
    api.post(`/friend/request/${id}/cancel`).then(res => res.data)
}

export const adminApplicationApi = {
  apply: (data: AdminApplicationRequest): Promise<ApiResponse<AdminApplication>> =>
    api.post('/admin/application', data).then(res => res.data),

  getMyApplication: (): Promise<ApiResponse<AdminApplication | null>> =>
    api.get('/admin/application/my').then(res => res.data)
}

export const messageApi = {
  // 获取私聊历史记录
  getPrivateHistory: (userId: number, friendId: number, current = 1, size = 20): Promise<ApiResponse<import('@/types').PrivateMessageHistoryResponse['data']>> => {
    const normalizedFriendId = Number(friendId)
    if (!Number.isFinite(normalizedFriendId) || normalizedFriendId <= 0) {
      return Promise.reject(new Error('friendId is invalid when fetching private history'))
    }
    return api.get(`/message/private/history?userId=${userId}&friendId=${normalizedFriendId}&current=${current}&size=${size}`).then(res => res.data)
  },

  // 获取群聊历史记录
  getChatRoomHistory: (roomId: number, current = 1, size = 20): Promise<ApiResponse<any>> => 
    api.get(`/message/chatroom/history?roomId=${roomId}&current=${current}&size=${size}`).then(res => res.data),

  // 标记私聊消息已读
  markPrivateRead: (data: PrivateReadRequest): Promise<ApiResponse<null>> =>
    api.post('/message/private/read', data).then(res => res.data),

  // 获取私聊未读数量
  getPrivateUnreadCount: (): Promise<ApiResponse<PrivateUnreadCount[]>> =>
    api.get('/message/private/unread-count').then(res => res.data)
}

export const fileApi = {
  upload: (file: File): Promise<ApiResponse<UploadFileInfo>> => {
    const formData = new FormData()
    formData.append('file', file)

    return api.post('/file/upload', formData).then(res => res.data)
  },

  download: (fileId: number): Promise<Blob> =>
    api.get(`/file/download/${fileId}`, { responseType: 'blob' }).then(res => res.data)
}

export const voiceApi = {
  transcribe: (data: VoiceTranscribeRequest): Promise<ApiResponse<VoiceTranscribeResponse>> =>
    api.post('/voice/transcribe', data, { timeout: 30000 }).then(res => res.data)
}

// 工具方法
export const apiUtils = {
  // 设置Token
  setToken: (token: string) => {
    runtimeToken = token
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  },

  // 获取Token
  getToken: (): string | null => {
    return runtimeToken || sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY)
  },

  // 清除Token
  clearToken: () => {
    runtimeToken = ''
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  },

  // 检查是否已登录
  isLoggedIn: (): boolean => {
    return !!(runtimeToken || sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY))
  }
}

export default api
