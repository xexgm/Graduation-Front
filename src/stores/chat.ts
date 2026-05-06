import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { webSocketService } from '@/websocket'
import { useUserStore } from './user'
import type { ChatRoom, Message, CompleteMessage, BackendChatRoom, User } from '@/types'
import { chatApi, authApi } from '@/api'
import { parseAudioMessageContent, parseFileMessageContent, resolveMessageType } from '@/utils/fileMessage'

let isWebSocketInitialized = false

export const useChatStore = defineStore('chat', () => {
  const rooms = ref<ChatRoom[]>([])
  const currentRoomId = ref<number | null>(null)
  const messages = ref<Record<string, Message[]>>({})
  const userDirectory = ref<Record<number, User>>({})
  const onlineCountByRoom = ref<Record<string, number>>({})
  let onlineCountTimer: number | null = null

  const currentRoom = computed(() => rooms.value.find(r => r.id === String(currentRoomId.value)) || null)
  const currentMessages = computed(() => (currentRoomId.value ? messages.value[currentRoomId.value] || [] : []))
  const unreadCount = computed(() => rooms.value.reduce((total, room) => total + room.unreadCount, 0))

  async function handleIncomingChatMessage(wsMessage: CompleteMessage) {
    if (wsMessage.content === null) return

    const userStore = useUserStore()
    // [Bug Fix] 防止出现两条消息: 如果这条消息是当前用户自己发的，并且我们在 sendMessage 时已经通过“乐观更新(Optimistic update)”添加了，这里就不需要再处理它了。
    // 虽然文档中说明后端排除了自己，但如果在某些特定情况下或者后续有回显的可能，做一次防重判断也是极好的。
    if (userStore.user && String(wsMessage.uid) === String(userStore.user.userId)) {
      console.log('====== [WebSocket] 过滤掉自己发送的回显消息 ======')
      return
    }

    // 异步确保发送者资料已缓存，便于前端显示用户名/头像
    ensureUserLoaded(wsMessage.uid)

    const type = resolveMessageType(wsMessage)
    const fileInfo = parseFileMessageContent(wsMessage.content) || undefined
    const audioInfo = parseAudioMessageContent(wsMessage.content) || undefined
    const message: Message = {
      id: `${wsMessage.uid}-${wsMessage.timeStamp}`,
      senderId: String(wsMessage.uid),
      roomId: String(wsMessage.toId),
      content: wsMessage.content,
      type,
      fileInfo,
      audioInfo,
      timestamp: new Date(wsMessage.timeStamp),
      status: 'delivered'
    }

    const roomId = message.roomId
    if (!roomId) return

    if (!messages.value[roomId]) {
      messages.value[roomId] = []
    }
    messages.value[roomId].push(message)

    const room = rooms.value.find(r => r.id === roomId)
    if (room) {
      room.lastMessage = message
      room.updatedAt = message.timestamp
      if (String(currentRoomId.value) !== roomId) {
        room.unreadCount++
      }
    }
  }

  async function initWebSocket() {
    if (isWebSocketInitialized) {
      console.log('WebSocket is already initialized, skipping.')
      return
    }

    const userStore = useUserStore()
    const token = userStore.token
    const user = userStore.user

    console.log('initWebSocket called. Token:', token ? 'exists' : 'missing', 'User:', user)

    if (!token || !user || !user.userId) {
      console.error('Cannot initialize WebSocket: user or token is missing or userId is not found.', { token: !!token, user })
      return
    }

    webSocketService.on('message:chat', handleIncomingChatMessage)
    
    try {
      console.log('Starting webSocketService.connect...')
      await webSocketService.connect(token, user.userId)
      console.log('webSocketService.connect resolved.')
      isWebSocketInitialized = true
    } catch (error) {
      console.error('webSocketService.connect failed:', error)
      throw error
    }
  }

  function disconnectWebSocket() {
    webSocketService.disconnect()
    webSocketService.off('message:chat', handleIncomingChatMessage)
    isWebSocketInitialized = false
  }

  async function fetchRooms() {
    try {
      const response = await chatApi.listChatRooms()
      if (response.code === 200 && response.data) {
        rooms.value = response.data.map((room: BackendChatRoom) => ({
          id: String(room.roomId),
          name: room.roomName,
          type: room.roomType === 'PRIVATE_ROOM' ? 'private' : 'group',
          participants: [],
          lastMessage: undefined,
          unreadCount: 0,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(room.roomName || 'room')}`,
          createdAt: new Date(room.createTimeStamp),
          updatedAt: new Date(room.createTimeStamp)
        }))
      } else {
        rooms.value = []
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
      rooms.value = []
    }
  }

  function setCurrentRoom(roomId: string | null) {
    if (roomId === null) {
      // 退出当前聊天室
      const userStore = useUserStore()
      const token = userStore.token
      const user = userStore.user
      if (currentRoomId.value !== null && token && user) {
        webSocketService.exitChatRoom(user.userId, token, currentRoomId.value)
      }
      currentRoomId.value = null
      // 停止在线人数轮询
      if (onlineCountTimer) {
        clearInterval(onlineCountTimer)
        onlineCountTimer = null
      }
      return
    }

    const room = rooms.value.find(r => r.id === roomId)
    if (room) {
      const userStore = useUserStore()
      const token = userStore.token
      const user = userStore.user
      if (!token || !user) return

      // Leave previous room if there was one
      if (currentRoomId.value !== null && currentRoomId.value !== Number(roomId)) {
        webSocketService.exitChatRoom(user.userId, token, currentRoomId.value)
      }

      // Join the new room
      currentRoomId.value = Number(roomId)
      webSocketService.enterChatRoom(user.userId, token, Number(roomId))
      room.unreadCount = 0 // Mark as read
      
      // 获取一次当前聊天室在线人数并启动轮询
      fetchRoomOnlineCount(Number(roomId)).catch(() => {})
      if (onlineCountTimer) {
        clearInterval(onlineCountTimer)
      }
      onlineCountTimer = window.setInterval(() => {
        if (currentRoomId.value !== null) {
          fetchRoomOnlineCount(currentRoomId.value as number).catch(() => {})
        }
      }, 10000)
    }
  }

  function leaveCurrentRoom() {
    setCurrentRoom(null)
  }

  async function sendMessage(content: string, type: Message['type'] = 'text') {
    const userStore = useUserStore()
    const token = userStore.token
    const user = userStore.user

    // Guard against missing room, user, or token. Allow for roomId 0.
    if ((!currentRoomId.value && currentRoomId.value !== 0) || !token || !user) {
      console.error('Cannot send message: missing currentRoomId, user, or token.')
      return
    }

    const roomId = currentRoomId.value
    const roomIdStr = String(roomId)

    // Optimistic update: add the message to the local state immediately.
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: String(user.userId),
      roomId: roomIdStr,
      content,
      type,
      fileInfo: type === 'file' ? parseFileMessageContent(content) || undefined : undefined,
      audioInfo: type === 'audio' ? parseAudioMessageContent(content) || undefined : undefined,
      timestamp: new Date(),
      status: 'sending'
    }

    if (!messages.value[roomIdStr]) {
      messages.value[roomIdStr] = []
    }
    messages.value[roomIdStr].push(optimisticMessage)

    // Call the WebSocket service to send the message to the server.
    if (type === 'audio') {
      webSocketService.sendChatAudioMessage(user.userId, token, roomId, content)
    } else if (type === 'file') {
      webSocketService.sendChatFileMessage(user.userId, token, roomId, content)
    } else {
      webSocketService.sendChatMessage(user.userId, token, roomId, content)
    }

    // Simulate updating message status after a delay.
    // In a real app, this would be triggered by a confirmation from the server.
    setTimeout(() => {
      const msg = messages.value[roomIdStr]?.find(m => m.id === optimisticMessage.id)
      if (msg) {
        msg.status = 'sent'
      }
    }, 1000)
  }

  async function fetchMessages(roomId: string) {
    // This is a placeholder. In a real app, you would fetch history from an API.
    if (!messages.value[roomId]) {
      messages.value[roomId] = []
    }
    return messages.value[roomId]
  }

  async function fetchRoomOnlineCount(roomId: number) {
    try {
      const resp = await chatApi.getRoomOnlineCount(roomId)
      if (resp.code === 200) {
        onlineCountByRoom.value[String(roomId)] = resp.data || 0
        const room = rooms.value.find(r => r.id === String(roomId))
        if (room) room.onlineCount = onlineCountByRoom.value[String(roomId)]
      }
    } catch (error) {
      console.error('Failed to fetch room online count:', error)
    }
  }

  // 用户信息缓存与获取
  function getUserById(userId: number): User | undefined {
    return userDirectory.value[userId]
  }

  async function ensureUserLoaded(userId: number) {
    if (!userId || userDirectory.value[userId]) return
    try {
      const resp = await authApi.getUserInfo(userId)
      if (resp.code === 200 && resp.data) {
        userDirectory.value[userId] = resp.data
      }
    } catch (e) {
      console.error('ensureUserLoaded failed:', e)
    }
  }

  async function createRoom(roomName: string, description?: string, roomType?: 'PUBLIC_ROOM' | 'PRIVATE_ROOM') {
    try {
      const response = await chatApi.createChatRoom({ roomName, description, roomType })
      if (response.code === 200 && response.data) {
        const newRoom: ChatRoom = {
          id: String(response.data.roomId),
          name: response.data.roomName,
          type: response.data.roomType === 'PRIVATE_ROOM' ? 'private' : 'group',
          participants: [],
          lastMessage: undefined,
          unreadCount: 0,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(response.data.roomName || 'room')}`,
          createdAt: new Date(response.data.createTimeStamp),
          updatedAt: new Date(response.data.createTimeStamp)
        }
        rooms.value.unshift(newRoom)
        return newRoom
      } else {
        throw new Error(response.message || 'Failed to create room')
      }
    } catch (error) {
      console.error('Failed to create room:', error)
      throw error
    }
  }

  async function deleteRoom(roomId: number) {
    try {
      await chatApi.deleteChatRoom(roomId)
      rooms.value = rooms.value.filter(r => r.id !== String(roomId))
      if (currentRoomId.value === roomId) {
        currentRoomId.value = null
      }
    } catch (error) {
      console.error('Failed to delete room:', error)
      throw error
    }
  }

  async function offlineRoom(roomId: number) {
    try {
      await chatApi.offlineChatRoom(roomId)
      // You might want to update the room status locally if your UI reflects it
    } catch (error) {
      console.error('Failed to offline room:', error)
      throw error
    }
  }

  return {
    rooms,
    currentRoomId,
    currentRoom,
    messages,
    currentMessages,
    unreadCount,
    initWebSocket,
    disconnectWebSocket,
    fetchRooms,
    setCurrentRoom,
    fetchRoomOnlineCount,
    leaveCurrentRoom,
    sendMessage,
    createRoom,
    deleteRoom,
    offlineRoom,
    fetchMessages,
    // 用户目录
    getUserById,
    ensureUserLoaded,
    userDirectory,
    onlineCountByRoom
  }
})
