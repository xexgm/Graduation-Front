import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElNotification } from 'element-plus'
import { webSocketService } from '@/websocket'
import { useChatStore } from '@/stores/chat'
import { useAppSettingsStore } from '@/stores/appSettings'
import type { ChatRoomStatusNoticePayload, CompleteMessage, SystemNoticePayload } from '@/types'

let isSystemNoticeWebSocketInitialized = false

export const useSystemNoticeStore = defineStore('systemNotice', () => {
  const latestNotices = ref<SystemNoticePayload[]>([])
  const latestChatRoomNotices = ref<SystemNoticePayload[]>([])
  const latestRoomStatusNotices = ref<ChatRoomStatusNoticePayload[]>([])

  function parsePayload<T>(content: string): T | null {
    try {
      return JSON.parse(content) as T
    } catch {
      return null
    }
  }

  function handleSystemNotice(message: CompleteMessage) {
    const appSettingsStore = useAppSettingsStore()
    const payload = parsePayload<SystemNoticePayload>(message.content) || {
      title: '系统通知',
      content: message.content
    }

    latestNotices.value.unshift(payload)
    appSettingsStore.playNotificationSound()
    ElNotification({
      title: payload.title || '系统通知',
      message: payload.content || '你收到一条系统通知',
      type: 'info',
      duration: 8000
    })
  }

  function handleChatRoomNotice(message: CompleteMessage) {
    const appSettingsStore = useAppSettingsStore()
    const payload = parsePayload<SystemNoticePayload>(message.content) || {
      title: '聊天室公告',
      content: message.content
    }

    latestChatRoomNotices.value.unshift(payload)
    appSettingsStore.playNotificationSound()
    ElNotification({
      title: payload.title || '聊天室公告',
      message: payload.content || '你收到一条聊天室公告',
      type: 'info',
      duration: 8000
    })
  }

  async function handleChatRoomStatusNotice(message: CompleteMessage) {
    const appSettingsStore = useAppSettingsStore()
    const payload = parsePayload<ChatRoomStatusNoticePayload>(message.content) || {
      message: message.content
    }

    latestRoomStatusNotices.value.unshift(payload)
    appSettingsStore.playNotificationSound()
    ElNotification({
      title: '聊天室状态变更',
      message: payload.message || '聊天室状态已发生变化',
      type: 'warning',
      duration: 0
    })

    const chatStore = useChatStore()
    await chatStore.fetchRooms().catch(() => {})
  }

  function initSystemNoticeWebSocket() {
    if (isSystemNoticeWebSocketInitialized) return

    webSocketService.on('notification:system-notice', handleSystemNotice)
    webSocketService.on('notification:chatroom-notice', handleChatRoomNotice)
    webSocketService.on('notification:chatroom-status', handleChatRoomStatusNotice)
    isSystemNoticeWebSocketInitialized = true
  }

  function stopSystemNoticeWebSocket() {
    if (!isSystemNoticeWebSocketInitialized) return

    webSocketService.off('notification:system-notice', handleSystemNotice)
    webSocketService.off('notification:chatroom-notice', handleChatRoomNotice)
    webSocketService.off('notification:chatroom-status', handleChatRoomStatusNotice)
    isSystemNoticeWebSocketInitialized = false
  }

  return {
    latestNotices,
    latestChatRoomNotices,
    latestRoomStatusNotices,
    initSystemNoticeWebSocket,
    stopSystemNoticeWebSocket
  }
})
