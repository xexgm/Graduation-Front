import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatRoom, Message, User, CompleteMessage } from '@/types'
import WebSocketManager from '@/websocket'
import { chatApi } from '@/api'
import { Rooms as presetRooms, Messages as presetMessages } from '@/utils/mockData'

export const useChatStore = defineStore('chat', () => {
  const rooms = ref<ChatRoom[]>([])
  const currentRoom = ref<ChatRoom | null>(null)
  const messages = ref<Record<string, Message[]>>({})
  const onlineUsers = ref<Set<number>>(new Set())
  const currentRoomId = ref<number | null>(null)
  const wsManager = ref<WebSocketManager | null>(null)

  const currentMessages = computed(() => {
    return currentRoom.value ? messages.value[currentRoom.value.id] || [] : []
  })

  const unreadCount = computed(() => {
    return rooms.value.reduce((total, room) => total + room.unreadCount, 0)
  })

  // 初始化WebSocket连接（支持本地模拟跳过连接）
  const initWebSocket = (token: string, userId: number) => {
    const IS_MOCK_WS = String(import.meta.env.VITE_ENABLE_MOCK_WS) === 'true'
    if (IS_MOCK_WS) {
      // 在本地开发模拟模式下，直接resolve，避免依赖真实WS服务
      return Promise.resolve()
    }

    return new Promise<void>((resolve, reject) => {
      wsManager.value = new WebSocketManager()
      
      // 监听连接事件
      wsManager.value.on('connected', () => {
        console.log('WebSocket连接成功')
        resolve()
      })

      wsManager.value.on('connection:established', (message: CompleteMessage) => {
        console.log('连接建立:', message.content)
      })

      wsManager.value.on('heartbeat:response', (message: CompleteMessage) => {
        console.log('心跳响应:', message.content)
      })

      // 监听聊天消息
      wsManager.value.on('chat:message', (message: CompleteMessage) => {
        handleChatMessage(message)
      })

      // 监听聊天室事件
      wsManager.value.on('room:joined', (message: CompleteMessage) => {
        console.log('加入聊天室:', message.content)
      })

      wsManager.value.on('room:left', (message: CompleteMessage) => {
        console.log('离开聊天室:', message.content)
      })

      wsManager.value.on('error', (error: Event) => {
        console.error('WebSocket错误:', error)
        reject(error)
      })

      // 开始连接
      wsManager.value.connect(token, userId).catch(reject)
    })
  }

  // 处理聊天消息
  const handleChatMessage = (wsMessage: CompleteMessage) => {
    const message: Message = {
      id: `${wsMessage.uid}-${wsMessage.timeStamp}`,
      senderId: wsMessage.uid.toString(),
      roomId: wsMessage.toId.toString(),
      content: wsMessage.content,
      type: 'text',
      timestamp: new Date(wsMessage.timeStamp),
      status: 'delivered'
    }

    addMessage(message)
  }

  // 添加消息到本地存储
  const addMessage = (message: Message) => {
    const roomId = message.roomId
    if (!roomId) return

    if (!messages.value[roomId]) {
      messages.value[roomId] = []
    }
    
    messages.value[roomId].push(message)
    updateRoomLastMessage(roomId, message)
  }

  // 更新房间最后一条消息
  const updateRoomLastMessage = (roomId: string, message: Message) => {
    const room = rooms.value.find(r => r.id === roomId)
    if (room) {
      room.lastMessage = message
      room.updatedAt = message.timestamp
      
      if (currentRoom.value?.id !== roomId) {
        room.unreadCount++
      }
    }
  }

  // 发送消息
  const sendMessage = async (content: string, type = 'text') => {
    if (!currentRoom.value || !wsManager.value || !currentRoomId.value) {
      throw new Error('聊天室或WebSocket未准备就绪')
    }

    try {
      // 创建临时消息
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        senderId: wsManager.value.currentUserId.toString(),
        roomId: currentRoom.value.id,
        content,
        type: type as any,
        timestamp: new Date(),
        status: 'sending'
      }

      // 添加到本地消息列表
      addMessage(tempMessage)

      // 通过WebSocket发送消息
      wsManager.value.sendChatMessage(currentRoomId.value, content)

      // 更新消息状态为已发送
      updateMessageStatus(tempMessage.id, 'sent')

      return tempMessage
    } catch (error) {
      console.error('发送消息失败:', error)
      throw error
    }
  }

  // 更新消息状态
  const updateMessageStatus = (messageId: string, status: Message['status']) => {
    for (const roomMessages of Object.values(messages.value)) {
      const message = roomMessages.find(m => m.id === messageId)
      if (message) {
        message.status = status
        break
      }
    }
  }

  // 加入聊天室
  const joinRoom = (roomId: number) => {
    if (wsManager.value) {
      currentRoomId.value = roomId
      wsManager.value.joinChatRoom(roomId)
    }
  }

  // 离开聊天室
  const leaveRoom = (roomId: number) => {
    if (wsManager.value) {
      wsManager.value.leaveChatRoom(roomId)
      if (currentRoomId.value === roomId) {
        currentRoomId.value = null
      }
    }
  }

  // 设置当前聊天室
  const setCurrentRoom = (room: ChatRoom | null) => {
    // 如果有当前聊天室，先离开
    if (currentRoomId.value) {
      leaveRoom(currentRoomId.value)
    }

    currentRoom.value = room
    
    if (room) {
      const roomIdNumber = parseInt(room.id)
      joinRoom(roomIdNumber)
      markAsRead(room.id)
    }
  }

  // 标记消息为已读
  const markAsRead = (roomId: string) => {
    const room = rooms.value.find(r => r.id === roomId)
    if (room) {
      room.unreadCount = 0
    }
  }

  // 获取聊天室列表（支持本地模拟或后端接口）
  const fetchRooms = async () => {
    const IS_MOCK_DATA = String(import.meta.env.VITE_ENABLE_MOCK_DATA) === 'true'
    if (IS_MOCK_DATA) {
      // 深拷贝，避免直接修改导入的常量
      const cloned: ChatRoom[] = JSON.parse(JSON.stringify(presetRooms))
      rooms.value = cloned

      // 简单模拟在线状态：将第一个房间的首个参与者标记在线
      if (cloned[0]?.participants[0]?.userId) {
        onlineUsers.value.add(cloned[0].participants[0].userId)
      }
      return cloned
    }

    // 非模拟：从后端拉取
    const resp = await chatApi.listChatRooms()
    if (resp.code === 200 && Array.isArray(resp.data)) {
      const mapped = resp.data.map((r) => ({
        id: String(r.roomId),
        name: r.roomName,
        type: (r.roomType === 'PRIVATE_ROOM' ? 'private' : 'group') as 'private' | 'group',
        participants: [],
        unreadCount: 0,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.roomName || 'room')}`,
        createdAt: new Date(r.createTimeStamp),
        updatedAt: new Date(r.createTimeStamp)
      })) as ChatRoom[]
      rooms.value = mapped
      return mapped
    }
    rooms.value = []
    return []
  }

  // 模拟获取消息历史（实际应该从API获取）
  const fetchMessages = async (roomId: string, page = 1) => {
    const IS_MOCK_DATA = String(import.meta.env.VITE_ENABLE_MOCK_DATA) === 'true'
    if (IS_MOCK_DATA) {
      const preset = presetMessages[roomId as keyof typeof presetMessages] || []
      // 覆盖为预置消息副本
      messages.value[roomId] = JSON.parse(JSON.stringify(preset))
      return messages.value[roomId]
    }

    // 非模拟：确保有数组
    if (!messages.value[roomId]) messages.value[roomId] = []
    return messages.value[roomId]
  }

  // 断开WebSocket连接
  const disconnect = () => {
    if (wsManager.value) {
      wsManager.value.disconnect()
      wsManager.value = null
    }
    currentRoomId.value = null
  }

  // 创建聊天室（管理员）
  const createRoom = async (roomName: string, description?: string, roomType?: 'PUBLIC_ROOM' | 'PRIVATE_ROOM') => {
    const resp = await chatApi.createChatRoom({ roomName, description, roomType })
    if (resp.code === 200 && resp.data) {
      const r = resp.data
      const newRoom: ChatRoom = {
        id: String(r.roomId),
        name: r.roomName,
        type: 'group',
        participants: [],
        unreadCount: 0,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.roomName || 'room')}`,
        createdAt: new Date(r.createTimeStamp),
        updatedAt: new Date(r.createTimeStamp)
      }
      rooms.value = [newRoom, ...rooms.value]
      return newRoom
    }
    throw new Error(resp.message || '创建聊天室失败')
  }

  // 下线聊天室（管理员）
  const offlineRoom = async (roomId: number) => {
    const resp = await chatApi.offlineChatRoom(roomId)
    if (resp.code !== 200) {
      throw new Error(resp.message || '下线失败')
    }
  }

  // 删除聊天室（管理员）
  const deleteRoom = async (roomId: number) => {
    const resp = await chatApi.deleteChatRoom(roomId)
    if (resp.code === 200) {
      rooms.value = rooms.value.filter(r => r.id !== String(roomId))
      if (currentRoom.value?.id === String(roomId)) {
        currentRoom.value = null
        currentRoomId.value = null
      }
      return
    }
    throw new Error(resp.message || '删除失败')
  }

  return {
    rooms,
    currentRoom,
    currentMessages,
    onlineUsers,
    unreadCount,
    initWebSocket,
    fetchRooms,
    fetchMessages,
    sendMessage,
    setCurrentRoom,
    markAsRead,
    joinRoom,
    leaveRoom,
    disconnect
    ,createRoom
    ,offlineRoom
    ,deleteRoom
  }
})
