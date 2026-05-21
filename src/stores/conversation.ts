import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Conversation, Message } from '@/types'
import { useChatStore } from './chat'
import { useFriendStore } from './friend'
import { formatAudioDuration, parseAudioMessageContent, parseFileMessageContent } from '@/utils/fileMessage'
import { formatEmojiPreview } from '@/utils/emoji'

function toConversationKey(type: 'private' | 'room', id: number): string {
  return `${type}:${id}`
}

function formatLastMessage(message?: Message): string | undefined {
  if (!message) return undefined

  const audioInfo = message.audioInfo || parseAudioMessageContent(message.content)
  if (message.type === 'audio' || audioInfo) {
    return `语音消息 ${formatAudioDuration(audioInfo?.duration || 0)}`
  }

  const fileInfo = message.fileInfo || parseFileMessageContent(message.content)
  if (message.type === 'file' || fileInfo) {
    return fileInfo?.fileName ? `文件：${fileInfo.fileName}` : '文件消息'
  }

  if (message.type === 'image') {
    return '图片消息'
  }

  return formatEmojiPreview(message.content)
}

export const useConversationStore = defineStore('conversation', () => {
  const activeConversationKey = ref<string | null>(null)

  const chatStore = useChatStore()
  const friendStore = useFriendStore()

  const privateConversations = computed<Conversation[]>(() => {
    return friendStore.friends.map((friend) => {
      const friendId = Number(friend.userId)
      const msgs = friendStore.privateMessages[friendId] || []
      const last = msgs.length ? msgs[msgs.length - 1] : undefined
      return {
        conversationId: toConversationKey('private', friendId),
        conversationType: 'private',
        title: friend.nickname || friend.username,
        avatar: friend.avatarUrl,
        lastMessage: formatLastMessage(last),
        lastMessageTime: last?.timestamp,
        unreadCount: friendStore.unreadCounts[friendId] || 0,
        friendId
      }
    })
  })

  const roomConversations = computed<Conversation[]>(() => {
    return chatStore.rooms.map((room) => {
      const roomId = Number(room.id)
      return {
        conversationId: toConversationKey('room', roomId),
        conversationType: 'room',
        title: room.name || `聊天室 ${room.id}`,
        avatar: room.avatar,
        lastMessage: formatLastMessage(room.lastMessage),
        lastMessageTime: room.lastMessage?.timestamp,
        unreadCount: room.unreadCount || 0,
        roomId
      }
    })
  })

  const conversations = computed<Conversation[]>(() => {
    return [...privateConversations.value, ...roomConversations.value].sort((a, b) => {
      const aTime = a.lastMessageTime ? a.lastMessageTime.getTime() : 0
      const bTime = b.lastMessageTime ? b.lastMessageTime.getTime() : 0
      return bTime - aTime
    })
  })

  const activeConversation = computed(() => {
    if (!activeConversationKey.value) return null
    return conversations.value.find((it) => it.conversationId === activeConversationKey.value) || null
  })

  async function openConversation(conversation: Conversation) {
    activeConversationKey.value = conversation.conversationId

    if (conversation.conversationType === 'private' && conversation.friendId) {
      chatStore.setCurrentRoom(null)
      await friendStore.openPrivateChat(conversation.friendId)
      return
    }

    if (conversation.conversationType === 'room' && conversation.roomId !== undefined) {
      friendStore.activeFriendId = null
      chatStore.setCurrentRoom(String(conversation.roomId))
      await chatStore.fetchMessages(String(conversation.roomId))
    }
  }

  async function openPrivateByFriendId(friendId: number) {
    const targetFriendId = Number(friendId)
    if (!Number.isFinite(targetFriendId) || targetFriendId <= 0) return

    const existing = privateConversations.value.find((it) => it.friendId === targetFriendId)
    if (existing) {
      await openConversation(existing)
      return
    }

    await openConversation({
      conversationId: toConversationKey('private', targetFriendId),
      conversationType: 'private',
      title: `好友 ${targetFriendId}`,
      unreadCount: 0,
      friendId: targetFriendId
    })
  }

  async function openRoomByRoomId(roomId: number) {
    const targetRoomId = Number(roomId)
    if (!Number.isFinite(targetRoomId) || targetRoomId < 0) return

    const existing = roomConversations.value.find((it) => it.roomId === targetRoomId)
    if (existing) {
      await openConversation(existing)
      return
    }

    await openConversation({
      conversationId: toConversationKey('room', targetRoomId),
      conversationType: 'room',
      title: `聊天室 ${targetRoomId}`,
      unreadCount: 0,
      roomId: targetRoomId
    })
  }

  function clearActiveConversation() {
    activeConversationKey.value = null
  }

  return {
    conversations,
    activeConversationKey,
    activeConversation,
    openConversation,
    openPrivateByFriendId,
    openRoomByRoomId,
    clearActiveConversation
  }
})

