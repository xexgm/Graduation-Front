import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Friend, Message, CompleteMessage } from '@/types'
import { friendApi, messageApi } from '@/api'
import { webSocketService } from '@/websocket'
import { useUserStore } from './user'

export const useFriendStore = defineStore('friend', () => {
  const friends = ref<Friend[]>([])
  const privateMessages = ref<Record<number, Message[]>>({})
  const unreadCounts = ref<Record<number, number>>({})
  const activeFriendId = ref<number | null>(null)
  
  let isFriendWebSocketInitialized = false
  let friendPollingTimer: number | null = null

  function normalizeFriend(rawFriend: any): Friend | null {
    const rawId = rawFriend?.userId ?? rawFriend?.friendId ?? rawFriend?.id
    const normalizedId = Number(rawId)
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
      return null
    }

    const rawStatus = rawFriend?.status
    const normalizedStatus =
      rawStatus === 1 || rawStatus === '1' || rawStatus === 'ONLINE' ? 1 : 0

    const rawRelationStatus = rawFriend?.relationStatus
    const normalizedRelationStatus =
      rawRelationStatus === 1 || rawRelationStatus === '1' || rawRelationStatus === 'BLOCKED' ? 1 : 0

    return {
      userId: normalizedId,
      username: String(rawFriend?.username || rawFriend?.nickname || `用户${normalizedId}`),
      nickname: String(rawFriend?.nickname || rawFriend?.username || `用户${normalizedId}`),
      avatarUrl: rawFriend?.avatarUrl || undefined,
      signature: rawFriend?.signature || undefined,
      status: normalizedStatus,
      relationStatus: normalizedRelationStatus
    }
  }

  async function fetchFriends() {
    const userStore = useUserStore()
    if (!userStore.user) return

    try {
      const response = await friendApi.getFriendList(userStore.user.userId)
      if (response.code === 200 && response.data) {
        friends.value = response.data
          .map(normalizeFriend)
          .filter((friend): friend is Friend => friend !== null)
      } else {
        friends.value = []
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error)
      friends.value = []
    }
  }

  async function addFriend(friendId: number) {
    const userStore = useUserStore()
    if (!userStore.user) return

    try {
      const response = await friendApi.addFriend(friendId, userStore.user.userId)
      if (response.code === 200) {
        await fetchFriends() // Refresh the list
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to add friend:', error)
      throw error
    }
  }

  async function fetchPrivateHistory(friendId: number) {
    const userStore = useUserStore()
    const normalizedFriendId = Number(friendId)
    if (!userStore.user) return
    if (!Number.isFinite(normalizedFriendId) || normalizedFriendId <= 0) {
      console.warn('未选择有效好友，不加载聊天记录:', friendId)
      return
    }

    try {
      const response = await messageApi.getPrivateHistory(userStore.user.userId, normalizedFriendId)
      if (response.code === 200 && response.data && response.data.records) {
        // Convert history records to Message interface
        const historyMessages: Message[] = response.data.records.map(record => ({
          id: String(record.msgId),
          senderId: String(record.senderId),
          receiverId: String(record.receiverId),
          roomId: '', // Optional for private chat
          content: record.content,
          type: 'text',
          timestamp: new Date(record.createTime),
          status: 'delivered'
        }))
        
        // Sort ascending by timestamp (oldest first)
        historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        privateMessages.value[normalizedFriendId] = historyMessages
      }
    } catch (error) {
      console.error(`Failed to fetch history for friend ${normalizedFriendId}:`, error)
    }
  }

  async function sendPrivateMessage(content: string) {
    const userStore = useUserStore()
    const token = userStore.token
    const user = userStore.user
    
    if (!token || !user || activeFriendId.value === null) {
      console.error('Cannot send private message: missing user, token or active friend.')
      return
    }

    const friendId = activeFriendId.value

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: String(user.userId),
      receiverId: String(friendId),
      content,
      type: 'text',
      timestamp: new Date(),
      status: 'sending'
    }

    if (!privateMessages.value[friendId]) {
      privateMessages.value[friendId] = []
    }
    privateMessages.value[friendId].push(optimisticMessage)

    // Call the WebSocket service
    webSocketService.sendPrivateMessage(user.userId, token, friendId, content)

    setTimeout(() => {
      const msg = privateMessages.value[friendId]?.find(m => m.id === optimisticMessage.id)
      if (msg) {
        msg.status = 'sent'
      }
    }, 500)
  }

  async function handleIncomingPrivateMessage(wsMessage: CompleteMessage) {
    const userStore = useUserStore()
    
    // 过滤掉自己发送的回显消息
    if (userStore.user && String(wsMessage.uid) === String(userStore.user.userId)) {
      console.log('====== [WebSocket] 私聊：过滤掉自己发送的回显消息 ======')
      return
    }

    const senderId = wsMessage.uid
    const receiverId = wsMessage.toId // should be current user's ID

    const message: Message = {
      id: `${wsMessage.uid}-${wsMessage.timeStamp}`,
      senderId: String(senderId),
      receiverId: String(receiverId),
      content: wsMessage.content,
      type: 'text',
      timestamp: new Date(wsMessage.timeStamp),
      status: 'delivered'
    }

    // 根据发送者ID (即好友ID) 寻找对应的聊天记录数组
    if (!privateMessages.value[senderId]) {
      privateMessages.value[senderId] = []
    }
    privateMessages.value[senderId].push(message)

    // 如果当前并没有点开这个好友的窗口，增加未读数
    if (activeFriendId.value !== senderId) {
      unreadCounts.value[senderId] = (unreadCounts.value[senderId] || 0) + 1
    }
  }

  function initFriendWebSocket() {
    if (isFriendWebSocketInitialized) return
    webSocketService.on('message:private', handleIncomingPrivateMessage)
    isFriendWebSocketInitialized = true
  }

  async function openPrivateChat(friendId: number) {
    const normalizedFriendId = Number(friendId)
    if (!Number.isFinite(normalizedFriendId) || normalizedFriendId <= 0) {
      console.warn('未选择有效好友，不打开私聊窗口:', friendId)
      return
    }

    activeFriendId.value = normalizedFriendId
    if (unreadCounts.value[normalizedFriendId]) {
      unreadCounts.value[normalizedFriendId] = 0
    }
    await fetchPrivateHistory(normalizedFriendId)
  }

  function startFriendPolling(intervalMs = 5000) {
    if (friendPollingTimer !== null) return

    friendPollingTimer = window.setInterval(() => {
      fetchFriends().catch((error) => {
        console.error('Friend polling failed:', error)
      })
    }, intervalMs)
  }

  function stopFriendPolling() {
    if (friendPollingTimer === null) return
    clearInterval(friendPollingTimer)
    friendPollingTimer = null
  }

  async function removeFriend(friendId: number) {
    const userStore = useUserStore()
    if (!userStore.user) return

    try {
      const response = await friendApi.removeFriend(friendId, userStore.user.userId)
      if (response.code === 200) {
        await fetchFriends() // Refresh the list
        if (activeFriendId.value === friendId) {
          activeFriendId.value = null
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to remove friend:', error)
      throw error
    }
  }

  return {
    friends,
    privateMessages,
    unreadCounts,
    activeFriendId,
    fetchFriends,
    addFriend,
    removeFriend,
    fetchPrivateHistory,
    sendPrivateMessage,
    openPrivateChat,
    initFriendWebSocket,
    startFriendPolling,
    stopFriendPolling
  }
})
