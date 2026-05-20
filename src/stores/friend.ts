import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Friend, FriendRequest, Message, CompleteMessage, PrivateUnreadCount } from '@/types'
import { friendApi, friendRequestApi, messageApi } from '@/api'
import { webSocketService } from '@/websocket'
import { useUserStore } from './user'
import { parseAudioMessageContent, parseFileMessageContent, resolveMessageType } from '@/utils/fileMessage'
import { toApiAssetUrl } from '@/utils/url'

export const useFriendStore = defineStore('friend', () => {
  const friends = ref<Friend[]>([])
  const privateMessages = ref<Record<number, Message[]>>({})
  const unreadCounts = ref<Record<number, number>>({})
  const activeFriendId = ref<number | null>(null)
  const receivedRequests = ref<FriendRequest[]>([])
  const sentRequests = ref<FriendRequest[]>([])
  
  let isFriendWebSocketInitialized = false
  let friendPollingTimer: number | null = null
  const pendingAckTimers: Record<string, number> = {}
  const lastReadMaxMsgIds: Record<number, number> = {}

  function generateClientMsgId(uid: number) {
    return `${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  function getPrivateMessageType(type: Message['type']) {
    if (type === 'file') return 2
    if (type === 'audio') return 3
    return 1
  }

  function normalizePrivateStatus(rawStatus?: number | string, isRead?: number): Message['status'] {
    if (rawStatus === 'READ' || rawStatus === 3 || rawStatus === '3' || isRead === 1) return 'read'
    if (rawStatus === 'DELIVERED' || rawStatus === 2 || rawStatus === '2') return 'delivered'
    return 'sent'
  }

  function toPrivateMessage(record: any): Message {
    const fileInfo = parseFileMessageContent(record.content) || undefined
    const audioInfo = parseAudioMessageContent(record.content) || undefined
    const messageType = Number(record.messageType || 1)

    return {
      id: String(record.msgId),
      msgId: record.msgId,
      clientMsgId: record.clientMsgId,
      senderId: String(record.senderId),
      receiverId: String(record.receiverId),
      roomId: '',
      content: record.content,
      type: audioInfo || messageType === 3 ? 'audio' : fileInfo || messageType === 2 ? 'file' : 'text',
      fileInfo,
      audioInfo,
      timestamp: new Date(record.createTime),
      status: normalizePrivateStatus(record.status, record.isRead),
      deliveredTime: record.deliveredTime ? new Date(record.deliveredTime) : undefined,
      readTime: record.readTime ? new Date(record.readTime) : undefined
    }
  }

  function getConversationMessages(friendId: number) {
    if (!privateMessages.value[friendId]) {
      privateMessages.value[friendId] = []
    }
    return privateMessages.value[friendId]
  }

  function clearAckTimer(clientMsgId?: string) {
    if (!clientMsgId || !pendingAckTimers[clientMsgId]) return
    clearTimeout(pendingAckTimers[clientMsgId])
    delete pendingAckTimers[clientMsgId]
  }

  function findOutgoingMessage(clientMsgId?: string, msgId?: number) {
    for (const list of Object.values(privateMessages.value)) {
      const message = list.find(item =>
        (clientMsgId && item.clientMsgId === clientMsgId) ||
        (msgId && item.msgId === msgId)
      )
      if (message) return message
    }
    return null
  }

  function scheduleAckTimeout(friendId: number, clientMsgId: string) {
    clearAckTimer(clientMsgId)
    pendingAckTimers[clientMsgId] = window.setTimeout(() => {
      const message = privateMessages.value[friendId]?.find(item => item.clientMsgId === clientMsgId)
      if (message?.status === 'sending') {
        message.status = 'failed'
      }
      delete pendingAckTimers[clientMsgId]
    }, 10000)
  }

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
      avatarUrl: toApiAssetUrl(rawFriend?.avatarUrl) || undefined,
      signature: rawFriend?.signature || undefined,
      userNo: rawFriend?.userNo || undefined,
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
    return sendFriendRequest(friendId)
  }

  async function sendFriendRequest(friendId: number, message?: string) {
    const userStore = useUserStore()
    if (!userStore.user) return

    try {
      const response = await friendRequestApi.send({ friendId, message })
      if (response.code === 200) {
        await fetchSentRequests()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to send friend request:', error)
      throw error
    }
  }

  async function sendFriendRequestByUserNo(friendUserNo: string, message?: string) {
    try {
      const response = await friendRequestApi.sendByUserNo({ friendUserNo, message })
      if (response.code === 200) {
        await fetchSentRequests()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to send friend request by userNo:', error)
      throw error
    }
  }

  async function fetchReceivedRequests(status = 0) {
    try {
      const response = await friendRequestApi.getReceived(status)
      receivedRequests.value = response.data || []
    } catch (error) {
      console.error('Failed to fetch received friend requests:', error)
      receivedRequests.value = []
    }
  }

  async function fetchSentRequests() {
    try {
      const response = await friendRequestApi.getSent()
      sentRequests.value = response.data || []
    } catch (error) {
      console.error('Failed to fetch sent friend requests:', error)
      sentRequests.value = []
    }
  }

  async function acceptFriendRequest(id: number) {
    const response = await friendRequestApi.accept(id)
    if (response.code === 200) {
      await Promise.all([fetchReceivedRequests(), fetchFriends()])
      return true
    }
    return false
  }

  async function rejectFriendRequest(id: number, reason?: string) {
    const response = await friendRequestApi.reject(id, { reason })
    if (response.code === 200) {
      await fetchReceivedRequests()
      return true
    }
    return false
  }

  async function cancelFriendRequest(id: number) {
    const response = await friendRequestApi.cancel(id)
    if (response.code === 200) {
      await fetchSentRequests()
      return true
    }
    return false
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
        const historyMessages: Message[] = response.data.records.map(toPrivateMessage)
        
        // Sort ascending by timestamp (oldest first)
        historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        privateMessages.value[normalizedFriendId] = historyMessages
        await markConversationRead(normalizedFriendId)
      }
    } catch (error) {
      console.error(`Failed to fetch history for friend ${normalizedFriendId}:`, error)
    }
  }

  async function fetchPrivateLatestMessages() {
    const userStore = useUserStore()
    const user = userStore.user
    if (!user) return

    await Promise.allSettled(friends.value.map(async (friend) => {
      const friendId = Number(friend.userId)
      if (!Number.isFinite(friendId) || friendId <= 0) return

      const response = await messageApi.getPrivateHistory(user.userId, friendId, 1, 1)
      const latestRecord = response.data?.records?.[0]
      if (!latestRecord) return

      const latestMessage = toPrivateMessage(latestRecord)
      const list = getConversationMessages(friendId)
      const exists = list.some(message =>
        (latestMessage.msgId && message.msgId === latestMessage.msgId) ||
        (latestMessage.clientMsgId && message.clientMsgId === latestMessage.clientMsgId)
      )
      if (!exists) {
        list.push(latestMessage)
        list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      }
    }))
  }

  async function sendPrivateMessage(content: string, type: Message['type'] = 'text', clientMsgId?: string) {
    const userStore = useUserStore()
    const token = userStore.token
    const user = userStore.user
    
    if (!token || !user || activeFriendId.value === null) {
      console.error('Cannot send private message: missing user, token or active friend.')
      return
    }

    const friendId = activeFriendId.value
    const finalClientMsgId = clientMsgId || generateClientMsgId(user.userId)

    // Optimistic update
    const optimisticMessage: Message = {
      id: finalClientMsgId,
      clientMsgId: finalClientMsgId,
      senderId: String(user.userId),
      receiverId: String(friendId),
      content,
      type,
      fileInfo: type === 'file' ? parseFileMessageContent(content) || undefined : undefined,
      audioInfo: type === 'audio' ? parseAudioMessageContent(content) || undefined : undefined,
      timestamp: new Date(),
      status: 'sending'
    }

    const list = getConversationMessages(friendId)
    const existing = list.find(message => message.clientMsgId === finalClientMsgId)
    if (existing) {
      Object.assign(existing, optimisticMessage)
    } else {
      list.push(optimisticMessage)
    }

    webSocketService.sendPrivateMessageWithClientId(
      user.userId,
      token,
      friendId,
      content,
      getPrivateMessageType(type),
      finalClientMsgId
    )

    scheduleAckTimeout(friendId, finalClientMsgId)
  }

  async function retryPrivateMessage(message: Message) {
    if (!message.clientMsgId) {
      return sendPrivateMessage(message.content, message.type)
    }
    return sendPrivateMessage(message.content, message.type, message.clientMsgId)
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

    const type = resolveMessageType(wsMessage)
    const fileInfo = parseFileMessageContent(wsMessage.content) || undefined
    const audioInfo = parseAudioMessageContent(wsMessage.content) || undefined
    const message: Message = {
      id: wsMessage.clientMsgId || `${wsMessage.uid}-${wsMessage.timeStamp}`,
      msgId: wsMessage.msgId,
      clientMsgId: wsMessage.clientMsgId,
      senderId: String(senderId),
      receiverId: String(receiverId),
      content: wsMessage.content,
      type,
      fileInfo,
      audioInfo,
      timestamp: new Date(wsMessage.timeStamp),
      status: 'delivered'
    }

    // 根据发送者ID (即好友ID) 寻找对应的聊天记录数组
    const list = getConversationMessages(senderId)
    const duplicate = list.some(item =>
      (message.msgId && item.msgId === message.msgId) ||
      (message.clientMsgId && item.clientMsgId === message.clientMsgId)
    )
    if (!duplicate) {
      list.push(message)
    }

    sendDeliveredAck(wsMessage)

    // 如果当前并没有点开这个好友的窗口，增加未读数
    if (activeFriendId.value !== senderId) {
      unreadCounts.value[senderId] = (unreadCounts.value[senderId] || 0) + 1
    } else {
      await markConversationRead(senderId)
    }
  }

  function sendDeliveredAck(wsMessage: CompleteMessage) {
    const userStore = useUserStore()
    const token = userStore.token
    const user = userStore.user
    if (!token || !user || !wsMessage.msgId) return
    webSocketService.sendPrivateDeliveredAck(user.userId, token, wsMessage.uid, wsMessage.msgId)
  }

  function handleServerAck(wsMessage: CompleteMessage) {
    const message = findOutgoingMessage(wsMessage.clientMsgId, wsMessage.msgId)
    if (!message) return

    clearAckTimer(message.clientMsgId)
    message.msgId = wsMessage.msgId || message.msgId
    message.status = 'sent'
  }

  function handleDeliveredAck(wsMessage: CompleteMessage) {
    const message = findOutgoingMessage(wsMessage.clientMsgId, wsMessage.msgId)
    if (!message) return
    if (message.status !== 'read') {
      message.status = 'delivered'
      message.deliveredTime = new Date(wsMessage.timeStamp)
    }
  }

  function handleReadAck(wsMessage: CompleteMessage) {
    let maxMsgId = wsMessage.msgId || 0
    try {
      const payload = JSON.parse(wsMessage.content || '{}')
      maxMsgId = Number(payload.maxMsgId || maxMsgId)
    } catch {}
    if (!maxMsgId) return

    const friendId = wsMessage.uid
    const list = privateMessages.value[friendId] || []
    list.forEach(message => {
      if (message.msgId && message.msgId <= maxMsgId && String(message.senderId) !== String(friendId)) {
        message.status = 'read'
        message.readTime = new Date(wsMessage.timeStamp)
      }
    })
  }

  async function markConversationRead(friendId: number) {
    const userStore = useUserStore()
    const token = userStore.token
    const user = userStore.user
    if (!token || !user || document.visibilityState !== 'visible') return

    const list = privateMessages.value[friendId] || []
    const maxMsgId = Math.max(
      0,
      ...list
        .filter(message => String(message.senderId) === String(friendId) && message.msgId)
        .map(message => Number(message.msgId))
    )
    if (!maxMsgId) return
    if ((lastReadMaxMsgIds[friendId] || 0) >= maxMsgId) return

    const previousUnreadCount = unreadCounts.value[friendId] || 0
    unreadCounts.value[friendId] = 0
    webSocketService.sendPrivateReadAck(user.userId, token, friendId, maxMsgId)
    try {
      await messageApi.markPrivateRead({ friendId, maxMsgId })
    } catch (error) {
      console.warn('HTTP mark private read failed:', error)
      if (previousUnreadCount > 0) {
        unreadCounts.value[friendId] = previousUnreadCount
      }
      return
    }

    list.forEach(message => {
      if (String(message.senderId) === String(friendId) && message.msgId && message.msgId <= maxMsgId) {
        message.status = 'read'
        message.readTime = new Date()
      }
    })
    lastReadMaxMsgIds[friendId] = maxMsgId
    await fetchUnreadCounts()
  }

  async function fetchUnreadCounts() {
    try {
      const response = await messageApi.getPrivateUnreadCount()
      const counts = response.data || []
      const nextCounts: Record<number, number> = {}
      counts.forEach((item: PrivateUnreadCount) => {
        nextCounts[Number(item.friendId)] = Number(item.unreadCount || 0)
      })
      unreadCounts.value = nextCounts
    } catch (error) {
      console.warn('Fetch private unread counts failed:', error)
    }
  }

  function initFriendWebSocket() {
    if (isFriendWebSocketInitialized) return
    webSocketService.on('message:private', handleIncomingPrivateMessage)
    webSocketService.on('message:private-server-ack', handleServerAck)
    webSocketService.on('message:private-delivered-ack', handleDeliveredAck)
    webSocketService.on('message:private-read-ack', handleReadAck)
    webSocketService.on('notification:friend-request', handleFriendRequestNotification)
    webSocketService.on('notification:friend-accepted', handleFriendAcceptedNotification)
    webSocketService.on('notification:friend-rejected', handleFriendRejectedNotification)
    isFriendWebSocketInitialized = true
  }

  async function handleFriendRequestNotification() {
    ElMessage.info('你收到一条好友请求')
    await fetchReceivedRequests()
  }

  async function handleFriendAcceptedNotification() {
    ElMessage.success('对方已通过你的好友请求')
    await Promise.all([fetchFriends(), fetchSentRequests()])
  }

  async function handleFriendRejectedNotification() {
    ElMessage.info('对方已拒绝你的好友请求')
    await fetchSentRequests()
  }

  async function openPrivateChat(friendId: number) {
    const normalizedFriendId = Number(friendId)
    if (!Number.isFinite(normalizedFriendId) || normalizedFriendId <= 0) {
      console.warn('未选择有效好友，不打开私聊窗口:', friendId)
      return
    }

    activeFriendId.value = normalizedFriendId
    await fetchPrivateHistory(normalizedFriendId)
    await markConversationRead(normalizedFriendId)
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
    receivedRequests,
    sentRequests,
    privateMessages,
    unreadCounts,
    activeFriendId,
    fetchFriends,
    fetchUnreadCounts,
    fetchPrivateLatestMessages,
    addFriend,
    sendFriendRequest,
    sendFriendRequestByUserNo,
    fetchReceivedRequests,
    fetchSentRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    fetchPrivateHistory,
    sendPrivateMessage,
    retryPrivateMessage,
    markConversationRead,
    openPrivateChat,
    initFriendWebSocket,
    startFriendPolling,
    stopFriendPolling
  }
})
