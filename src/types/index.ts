// 后端API统一响应格式
export interface ApiResponse<T = any> {
  code: number        // 状态码: 200=成功, 400=失败, 401=未授权
  message: string     // 响应消息
  data: T | null      // 响应数据
  timestamp: number   // 时间戳
}

// 用户相关类型
export interface User {
  userId: number
  username: string
  nickname: string
  avatarUrl?: string
  signature?: string
  role?: number
  status: number
  createTime: number
  updateTime: number
}

// 登录注册表单
export interface LoginForm {
  username: string
  password: string
}

export interface RegisterForm {
  username: string
  password: string
  nickname?: string
}

// API响应类型
export interface LoginResponse {
  user: User
  token: string
  tokenExpireTime: number
}

export interface RegisterResponse extends User {}

export interface LogoutRequest {
  userId: number
  token?: string
}

export interface ChangePasswordRequest {
  userId: number
  oldPassword: string
  newPassword: string
}

export interface TokenRequest {
  token: string
}

// WebSocket消息类型
export interface CompleteMessage {
  appId: number        // 业务线ID: 0=Link(基础连接), 1=ChatRoom(聊天室)
  uid: number          // 用户ID
  token: string        // 用户Token
  compression?: number // 是否压缩
  encryption?: number  // 是否加密
  messageType: number  // 消息类型
  toId?: number        // 接收方ID (聊天室ID或用户ID)
  content: string | null // 消息内容
  timeStamp: number    // 发送时间戳
}

// 聊天相关类型
export interface Message {
  id: string
  senderId: string
  receiverId?: string
  roomId?: string
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  timestamp: Date
  status: 'sending' | 'sent' | 'delivered' | 'read'
}

export interface ChatRoom {
  id: string
  name?: string
  type: 'private' | 'group'
  participants: User[]
  lastMessage?: Message
  unreadCount: number
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

// 后端聊天室类型（文档字段）
export type ChatRoomType = 'PUBLIC_ROOM' | 'PRIVATE_ROOM'
export type ChatRoomStatus = 'ACTIVE' | 'DISBANDED' | 'DELETED'

// 后端返回的聊天室实体
export interface BackendChatRoom {
  roomId: number
  roomName: string
  description?: string
  ownerId: number
  roomType: ChatRoomType
  createTimeStamp: number
  status: ChatRoomStatus
}

// 创建聊天室请求体
export interface CreateChatRoomRequest {
  roomName: string
  description?: string
  roomType?: ChatRoomType
}
