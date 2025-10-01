import axios, { type AxiosResponse, type AxiosRequestConfig } from 'axios'
import type { ApiResponse, LoginForm, RegisterForm, User, Message, ChatRoom } from '@/types'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message } = response.data
    if (code !== 200) {
      ElMessage.error(message || '请求失败')
      return Promise.reject(new Error(message))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    } else {
      ElMessage.error(error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (data: LoginForm): Promise<ApiResponse<{ user: User; token: string }>> =>
    api.post('/auth/login', data).then(res => res.data),
    
  register: (data: RegisterForm): Promise<ApiResponse<User>> =>
    api.post('/auth/register', data).then(res => res.data),
    
  logout: (): Promise<ApiResponse> =>
    api.post('/auth/logout').then(res => res.data),
    
  getUserInfo: (): Promise<ApiResponse<User>> =>
    api.get('/auth/me').then(res => res.data)
}

export const userApi = {
  updateProfile: (data: Partial<User>): Promise<ApiResponse<User>> =>
    api.put('/users/profile', data).then(res => res.data),
    
  updateAvatar: (file: File): Promise<ApiResponse<{ avatar: string }>> => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data)
  },
  
  searchUsers: (keyword: string): Promise<ApiResponse<User[]>> =>
    api.get(`/users/search?keyword=${keyword}`).then(res => res.data)
}

export const chatApi = {
  getRooms: (): Promise<ApiResponse<ChatRoom[]>> =>
    api.get('/chat/rooms').then(res => res.data),
    
  getMessages: (roomId: string, page = 1, size = 20): Promise<ApiResponse<Message[]>> =>
    api.get(`/chat/rooms/${roomId}/messages?page=${page}&size=${size}`).then(res => res.data),
    
  sendMessage: (roomId: string, content: string, type = 'text'): Promise<ApiResponse<Message>> =>
    api.post(`/chat/rooms/${roomId}/messages`, { content, type }).then(res => res.data),
    
  createRoom: (userIds: string[], name?: string): Promise<ApiResponse<ChatRoom>> =>
    api.post('/chat/rooms', { userIds, name }).then(res => res.data),
    
  markAsRead: (roomId: string): Promise<ApiResponse> =>
    api.post(`/chat/rooms/${roomId}/read`).then(res => res.data),
    
  uploadFile: (file: File): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data)
  }
}

export default api