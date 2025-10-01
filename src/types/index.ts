export interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
  email?: string
  status: 'online' | 'offline' | 'away'
  lastSeen?: Date
}

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

export interface LoginForm {
  username: string
  password: string
  remember?: boolean
}

export interface RegisterForm {
  username: string
  password: string
  confirmPassword: string
  email?: string
  nickname?: string
}

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface WebSocketMessage {
  type: 'message' | 'user_join' | 'user_leave' | 'typing' | 'heartbeat'
  data: any
  timestamp: Date
}