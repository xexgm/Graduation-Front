import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { ChatRoom, Message, User } from '@/types'
import { chatApi } from '@/api'
import WebSocketManager from '@/websocket'

export const useChatStore = defineStore('chat', () => {
  const rooms = ref<ChatRoom[]>([])
  const currentRoom = ref<ChatRoom | null>(null)
  const messages = ref<Record<string, Message[]>>({})
  const onlineUsers = ref<Set<string>>(new Set())
  const typingUsers = ref<Record<string, Set<string>>>({})
  const wsManager = ref<WebSocketManager | null>(null)

  const currentMessages = computed(() => {
    return currentRoom.value ? messages.value[currentRoom.value.id] || [] : []
  })

  const unreadCount = computed(() => {
    return rooms.value.reduce((total, room) => total + room.unreadCount, 0)
  })

  const initWebSocket = (token: string) => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws'
    wsManager.value = new WebSocketManager(wsUrl)
    
    wsManager.value.on('message:received', (wsMessage) => {
      const message = wsMessage.data as Message
      addMessage(message)
    })

    wsManager.value.on('user:online', ({ userId }) => {
      onlineUsers.value.add(userId)
    })

    wsManager.value.on('user:offline', ({ userId }) => {
      onlineUsers.value.delete(userId)
    })

    wsManager.value.on('typing:start', ({ userId, roomId }) => {
      if (!typingUsers.value[roomId]) {
        typingUsers.value[roomId] = new Set()
      }
      typingUsers.value[roomId].add(userId)
    })

    wsManager.value.on('typing:stop', ({ userId, roomId }) => {
      if (typingUsers.value[roomId]) {
        typingUsers.value[roomId].delete(userId)
      }
    })

    return wsManager.value.connect(token)
  }

  const fetchRooms = async () => {
    try {
      const response = await chatApi.getRooms()
      rooms.value = response.data
      return response.data
    } catch (error) {
      throw error
    }
  }

  const fetchMessages = async (roomId: string, page = 1) => {
    try {
      const response = await chatApi.getMessages(roomId, page)
      const roomMessages = response.data
      
      if (page === 1) {
        messages.value[roomId] = roomMessages
      } else {
        messages.value[roomId] = [...roomMessages, ...(messages.value[roomId] || [])]
      }
      
      return roomMessages
    } catch (error) {
      throw error
    }
  }

  const sendMessage = async (content: string, type = 'text') => {
    if (!currentRoom.value) return

    try {
      const tempMessage: Message = {
        id: Date.now().toString(),
        senderId: 'current-user',
        receiverId: currentRoom.value.type === 'private' ? currentRoom.value.participants[0]?.id : undefined,
        roomId: currentRoom.value.id,
        content,
        type: type as any,
        timestamp: new Date(),
        status: 'sending'
      }

      addMessage(tempMessage)

      const response = await chatApi.sendMessage(currentRoom.value.id, content, type)
      const sentMessage = response.data
      
      updateMessage(tempMessage.id, sentMessage)
      
      if (wsManager.value && wsManager.value.isConnected) {
        wsManager.value.send({
          type: 'message',
          data: sentMessage,
          timestamp: new Date()
        })
      }

      return sentMessage
    } catch (error) {
      const errorMessage = messages.value[currentRoom.value.id]?.find(m => m.id === Date.now().toString())
      if (errorMessage) {
        errorMessage.status = 'sent'
      }
      throw error
    }
  }

  const addMessage = (message: Message) => {
    const roomId = message.roomId
    if (!roomId) return

    if (!messages.value[roomId]) {
      messages.value[roomId] = []
    }
    
    messages.value[roomId].push(message)
    updateRoomLastMessage(roomId, message)
  }

  const updateMessage = (tempId: string, newMessage: Message) => {
    const roomId = newMessage.roomId
    if (!roomId || !messages.value[roomId]) return

    const index = messages.value[roomId].findIndex(m => m.id === tempId)
    if (index > -1) {
      messages.value[roomId][index] = newMessage
    }
  }

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

  const markAsRead = async (roomId: string) => {
    try {
      await chatApi.markAsRead(roomId)
      const room = rooms.value.find(r => r.id === roomId)
      if (room) {
        room.unreadCount = 0
      }
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  const setCurrentRoom = (room: ChatRoom | null) => {
    currentRoom.value = room
    if (room) {
      markAsRead(room.id)
    }
  }

  const createRoom = async (userIds: string[], name?: string) => {
    try {
      const response = await chatApi.createRoom(userIds, name)
      const newRoom = response.data
      rooms.value.unshift(newRoom)
      return newRoom
    } catch (error) {
      throw error
    }
  }

  const sendTyping = (isTyping: boolean) => {
    if (!currentRoom.value || !wsManager.value?.isConnected) return

    wsManager.value.send({
      type: 'typing',
      data: {
        userId: 'current-user',
        roomId: currentRoom.value.id,
        isTyping
      },
      timestamp: new Date()
    })
  }

  const disconnect = () => {
    if (wsManager.value) {
      wsManager.value.disconnect()
      wsManager.value = null
    }
  }

  return {
    rooms,
    currentRoom,
    currentMessages,
    onlineUsers,
    typingUsers,
    unreadCount,
    initWebSocket,
    fetchRooms,
    fetchMessages,
    sendMessage,
    setCurrentRoom,
    createRoom,
    markAsRead,
    sendTyping,
    disconnect
  }
})