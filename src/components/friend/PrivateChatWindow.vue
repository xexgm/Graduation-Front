<template>
  <div class="private-chat-window" v-if="activeFriend">
    <div class="chat-header">
      <div class="header-user-info">
        <el-avatar :size="40" :src="activeFriend.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${activeFriend.nickname}`" />
        <span class="header-name">{{ activeFriend.nickname || activeFriend.username }}</span>
      </div>
      <el-button size="small" @click="closeChat">关闭</el-button>
    </div>

    <el-scrollbar class="message-list" ref="scrollbarRef">
      <div class="message-container">
        <div v-if="!messages || messages.length === 0" class="empty-messages">
          <el-empty description="暂无聊天记录，打个招呼吧！" :image-size="60" />
        </div>
        
        <div 
          v-for="msg in messages" 
          :key="msg.id"
          class="message-item"
          :class="{ 'message-mine': isMyMessage(msg.senderId) }"
        >
          <el-avatar 
            class="msg-avatar"
            :size="36" 
            :src="getAvatarForMessage(msg.senderId)" 
          />
          <div class="msg-content-wrapper">
            <div class="msg-name" v-if="!isMyMessage(msg.senderId)">
              {{ getNicknameForMessage(msg.senderId) }}
            </div>
            <div class="msg-bubble">
              {{ msg.content }}
            </div>
            <div class="msg-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>
      </div>
    </el-scrollbar>

    <div class="chat-input-area">
      <el-input
        v-model="inputContent"
        type="textarea"
        :rows="3"
        placeholder="输入私聊消息，按 Enter 发送"
        resize="none"
        @keydown.enter.prevent="handleSend"
      />
      <div class="input-actions">
        <el-button type="primary" :disabled="!inputContent.trim()" @click="handleSend">
          发送
        </el-button>
      </div>
    </div>
  </div>
  <div v-else class="empty-chat-selection">
    <el-empty description="点击左侧好友开始聊天" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useFriendStore } from '@/stores/friend'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'

const friendStore = useFriendStore()
const userStore = useUserStore()

const inputContent = ref('')
const scrollbarRef = ref()

const activeFriend = computed(() => {
  if (friendStore.activeFriendId === null) return null
  return friendStore.friends.find(f => f.userId === friendStore.activeFriendId) || null
})

const messages = computed(() => {
  if (friendStore.activeFriendId === null) return []
  return friendStore.privateMessages[friendStore.activeFriendId] || []
})

const isMyMessage = (senderId: string | number) => {
  return String(senderId) === String(userStore.user?.userId)
}

const getAvatarForMessage = (senderId: string | number) => {
  if (isMyMessage(senderId)) {
    return userStore.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${userStore.user?.nickname}`
  }
  return activeFriend.value?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${activeFriend.value?.nickname}`
}

const getNicknameForMessage = (senderId: string | number) => {
  if (isMyMessage(senderId)) return userStore.user?.nickname
  return activeFriend.value?.nickname || activeFriend.value?.username
}

const formatTime = (time: Date) => {
  return dayjs(time).format('HH:mm')
}

const closeChat = () => {
  friendStore.activeFriendId = null
}

const scrollToBottom = async () => {
  await nextTick()
  if (scrollbarRef.value) {
    const wrap = scrollbarRef.value.wrapRef
    if (wrap) {
      wrap.scrollTop = wrap.scrollHeight
    }
  }
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })

const handleSend = async () => {
  const content = inputContent.value.trim()
  if (!content) return
  
  await friendStore.sendPrivateMessage(content)
  inputContent.value = ''
  scrollToBottom()
}
</script>

<style scoped lang="scss">
.private-chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
}

.empty-chat-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: var(--bg-color-soft);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-white);
  
  .header-user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .header-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
  }
}

.message-list {
  flex: 1;
  padding: 20px;
  background: var(--bg-color-soft);
}

.message-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-item {
  display: flex;
  gap: 12px;
  max-width: 80%;

  &.message-mine {
    align-self: flex-end;
    flex-direction: row-reverse;
    
    .msg-content-wrapper {
      align-items: flex-end;
    }
    
    .msg-bubble {
      background: var(--primary-color);
      color: white;
      border-radius: 12px 0 12px 12px;
    }
  }
}

.msg-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.msg-name {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 4px;
}

.msg-bubble {
  background: var(--bg-white);
  padding: 10px 14px;
  border-radius: 0 12px 12px 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  word-break: break-word;
}

.msg-time {
  font-size: 11px;
  color: var(--text-placeholder);
  margin-top: 2px;
}

.chat-input-area {
  padding: 16px;
  background: var(--bg-white);
  border-top: 1px solid var(--border-color);
  
  :deep(.el-textarea__inner) {
    background: var(--bg-color-soft);
    border: none;
    box-shadow: none;
    
    &:focus {
      box-shadow: 0 0 0 1px var(--primary-light) inset;
    }
  }
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
