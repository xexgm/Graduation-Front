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

export type UserRole = 0 | 1 | 2
export type UserStatus = 0 | 1
export type AdminApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 0 | 1 | 2 | 3

export interface AdminApplication {
  id: number
  userId: number
  username?: string
  nickname?: string
  avatarUrl?: string
  reason?: string
  status: AdminApplicationStatus
  reviewerId?: number
  reviewComment?: string
  reviewedTime?: string
  approvedTime?: string
  createTime?: string
}

export interface AdminApplicationRequest {
  reason: string
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
  toId: number         // 接收方ID (聊天室ID或用户ID)
  content: string      // 消息内容
  timeStamp: number    // 发送时间戳
  msgId?: number        // 服务端消息ID，用于 ACK/已读回执
  clientMsgId?: string  // 客户端消息ID，用于匹配本地临时消息
}

export interface SystemNoticePayload {
  type?: 'SYSTEM_NOTICE' | 'CHAT_ROOM_SYSTEM_NOTICE'
  noticeId?: number
  title?: string
  content?: string
}

export interface ChatRoomStatusNoticePayload {
  type?: 'CHAT_ROOM_STATUS_NOTICE'
  roomId?: number
  status?: ChatRoomStatus | string | number
  message?: string
}

export interface UploadFileInfo {
  fileId: number
  fileName: string
  fileSize: number
  contentType?: string
}

export interface FileMessagePayload extends UploadFileInfo {
  messageKind: 'FILE'
}

export interface AudioMessagePayload extends UploadFileInfo {
  messageKind: 'AUDIO'
  duration: number
}

export type VoiceTranscriptionStatus = 'PROCESSING' | 'SUCCESS' | 'FAILED' | 0 | 1 | 2

export interface VoiceTranscribeRequest {
  fileId: number
}

export interface VoiceTranscribeResponse {
  fileId: number
  text?: string
  cached?: boolean
  status: VoiceTranscriptionStatus
}

export interface VoiceTranscriptionState {
  loading: boolean
  text?: string
  error?: string
  expanded?: boolean
}

export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages?: number
}

export interface AdminUser {
  userId: number
  username: string
  nickname?: string
  avatarUrl?: string
  signature?: string
  role: UserRole
  status: UserStatus
  createTime?: string | number
  updateTime?: string | number
}

export interface AdminUserQuery {
  current?: number
  size?: number
  keyword?: string
  role?: UserRole | ''
  status?: UserStatus | ''
}

export interface AdminBanRequest {
  reason?: string
}

export interface AdminApplicationQuery {
  status?: AdminApplicationStatus | ''
  current?: number
  size?: number
}

export interface AdminReviewRequest {
  reviewComment?: string
}

export interface AdminChatRoom {
  roomId: number
  roomName: string
  description?: string
  ownerId?: number
  ownerUsername?: string
  ownerNickname?: string
  roomType?: ChatRoomType
  status: ChatRoomStatus | number | string
  createTimeStamp?: number
  createTime?: string
  onlineCount?: number
}

export interface AdminChatRoomQuery {
  current?: number
  size?: number
  keyword?: string
  status?: ChatRoomStatus | number | ''
}

export interface AdminNotice {
  noticeId: number
  title: string
  content: string
  targetType: 1 | 2 | 'ALL_USERS' | 'ALL_CHATROOMS'
  publisherId?: number
  publisherUsername?: string
  status: 0 | 1 | 'REVOKED' | 'PUBLISHED'
  publishTime?: string
  createTime?: string
  updateTime?: string
}

export interface AdminNoticeCreateRequest {
  title: string
  content: string
  targetType: 1 | 2
}

export interface AdminNoticeQuery {
  current?: number
  size?: number
  targetType?: 1 | 2 | ''
  status?: 0 | 1 | ''
}

// 聊天相关类型
export interface Message {
  id: string
  msgId?: number
  clientMsgId?: string
  senderId: string
  receiverId?: string
  roomId?: string
  content: string
  type: 'text' | 'image' | 'file' | 'audio' | 'system'
  fileInfo?: FileMessagePayload
  audioInfo?: AudioMessagePayload
  timestamp: Date
  status: 'sending' | 'failed' | 'sent' | 'delivered' | 'read'
  deliveredTime?: Date
  readTime?: Date
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
  onlineCount?: number
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

// ---------------- 好友管理与私聊相关类型 ----------------

/**
 * Represents a user in the friend list.
 * Based on the backend `FriendResponse`.
 */
export interface Friend {
  userId: number;
  username: string;
  nickname: string;
  avatarUrl?: string;
  signature?: string;
  status: number;         // 0=Offline, 1=Online
  relationStatus: number; // 0=Normal, 1=Blocked
}

export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED' | 0 | 1 | 2 | 3

export interface FriendRequest {
  id: number
  senderId: number
  senderUsername?: string
  senderNickname?: string
  senderAvatarUrl?: string
  receiverId: number
  receiverUsername?: string
  receiverNickname?: string
  receiverAvatarUrl?: string
  message?: string
  status: FriendRequestStatus
  handleTime?: string
  createTime?: string
}

export interface FriendRequestCreateRequest {
  friendId: number
  message?: string
}

export interface FriendRequestRejectRequest {
  reason?: string
}

/**
 * Response structure for the friend list API.
 */
export interface FriendListResponse {
  code: number;
  message: string;
  data: Friend[];
}

/**
 * Represents a single private message in history.
 * Based on the backend `PrivateMessage`.
 */
export interface PrivateMessageHistory {
  msgId: number;
  clientMsgId?: string;
  senderId: number;
  receiverId: number;
  messageType?: number;
  content: string;
  status?: number | 'SENT' | 'DELIVERED' | 'READ';
  isRead: number;      // 0=Unread, 1=Read
  deliveredTime?: string;
  readTime?: string;
  createTime: string;  // ISO 8601 string or format "YYYY-MM-DD HH:mm:ss"
}

export interface PrivateReadRequest {
  friendId: number
  maxMsgId: number
}

export interface PrivateUnreadCount {
  friendId: number
  unreadCount: number
}

/**
 * Paginated response structure for private chat history.
 */
export interface PrivateMessageHistoryResponse {
  code: number;
  message: string;
  data: {
    records: PrivateMessageHistory[];
    total: number;
    size: number;
    current: number;
    pages: number;
  }
}

// ---------------- 统一会话模型（UI重构） ----------------

export type ConversationType = 'private' | 'room'

export interface Conversation {
  conversationId: string
  conversationType: ConversationType
  title: string
  avatar?: string
  lastMessage?: string
  lastMessageTime?: Date
  unreadCount: number
  friendId?: number
  roomId?: number
}

