<template>
  <div class="message-list scrollbar-thin" ref="messageListRef">
    <div class="messages-container">
      <transition-group name="message" tag="div">
        <div
          v-for="message in groupedMessages"
          :key="message.id"
          class="message-group"
        >
          <template v-if="message.type === 'date'">
            <div class="date-divider">
              <span>{{ message.content }}</span>
            </div>
          </template>
          <template v-else>
            <div
              class="message-wrapper"
              :class="{ 
                'sent': message.senderId === currentUserId,
                'received': message.senderId !== currentUserId 
              }"
            >
              <div v-if="message.senderId !== currentUserId" class="message-avatar">
                <el-avatar :size="32" :src="getSenderAvatar(message.senderId)">
                  {{ getSenderName(message.senderId)[0] }}
                </el-avatar>
              </div>
              
              <div class="message-content">
                <div v-if="message.senderId !== currentUserId" class="message-sender">
                  {{ getSenderName(message.senderId) }}
                </div>
                
                <div 
                  class="message-bubble"
                  :class="{ 
                    'sent': message.senderId === currentUserId,
                    'received': message.senderId !== currentUserId 
                  }"
                >
                  <template v-if="message.type === 'text'">
                    <div class="message-text">{{ message.content }}</div>
                  </template>
                  <template v-else-if="message.type === 'image'">
                    <img :src="message.content" class="message-image" @click="previewImage(message.content)" />
                  </template>
                  <template v-else-if="message.type === 'file'">
                    <div class="message-file">
                      <el-icon><Document /></el-icon>
                      <span>{{ message.content }}</span>
                    </div>
                  </template>
                  
                  <div class="message-meta">
                    <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                    <div v-if="message.senderId === currentUserId" class="message-status">
                      <el-icon v-if="message.status === 'sending'" class="status-sending">
                        <Loading />
                      </el-icon>
                      <el-icon v-else-if="message.status === 'sent'" class="status-sent">
                        <Check />
                      </el-icon>
                      <el-icon v-else-if="message.status === 'delivered'" class="status-delivered">
                        <Select />
                      </el-icon>
                      <el-icon v-else-if="message.status === 'read'" class="status-read">
                        <Select />
                      </el-icon>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </transition-group>
      
      <!-- 正在输入指示器 -->
      <div v-if="typingUsers.length > 0" class="typing-indicator-wrapper">
        <div class="typing-indicator">
          <span>{{ getTypingText() }}</span>
          <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Document, Loading, Check, Select } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import type { ChatRoom, Message } from '@/types'

const props = defineProps<{
  room: ChatRoom
}>()

const userStore = useUserStore()
const chatStore = useChatStore()
const messageListRef = ref<HTMLElement>()

const currentUserId = computed(() => userStore.user?.id || '')

const messages = computed(() => chatStore.currentMessages)

const typingUsers = computed(() => {
  const roomTyping = chatStore.typingUsers[props.room.id]
  if (!roomTyping) return []
  
  return Array.from(roomTyping).filter(userId => userId !== currentUserId.value)
})

const groupedMessages = computed(() => {
  const grouped: any[] = []
  let lastDate = ''
  
  messages.value.forEach((message: Message) => {
    const messageDate = dayjs(message.timestamp).format('YYYY-MM-DD')
    
    if (messageDate !== lastDate) {
      grouped.push({
        id: `date-${messageDate}`,
        type: 'date',
        content: formatDate(message.timestamp)
      })
      lastDate = messageDate
    }
    
    grouped.push(message)
  })
  
  return grouped
})

const getSenderName = (senderId: string) => {
  const sender = props.room.participants.find(p => p.id === senderId)
  return sender?.nickname || sender?.username || '未知用户'
}

const getSenderAvatar = (senderId: string) => {
  const sender = props.room.participants.find(p => p.id === senderId)
  return sender?.avatar
}

const formatTime = (timestamp: Date) => {
  return dayjs(timestamp).format('HH:mm')
}

const formatDate = (timestamp: Date) => {
  const now = dayjs()
  const time = dayjs(timestamp)
  
  if (now.diff(time, 'day') === 0) {
    return '今天'
  } else if (now.diff(time, 'day') === 1) {
    return '昨天'
  } else if (now.diff(time, 'year') === 0) {
    return time.format('MM月DD日')
  } else {
    return time.format('YYYY年MM月DD日')
  }
}

const getTypingText = () => {
  if (typingUsers.value.length === 1) {
    return `${getSenderName(typingUsers.value[0] as string)} 正在输入`
  } else if (typingUsers.value.length > 1) {
    return `${typingUsers.value.length} 人正在输入`
  }
  return ''
}

const previewImage = (src: string) => {
  // TODO: 实现图片预览
  console.log('预览图片:', src)
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })

watch(() => props.room.id, () => {
  scrollToBottom()
})

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped lang="scss">
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.messages-container {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.date-divider {
  text-align: center;
  margin: 16px 0;
  
  span {
    background: var(--bg-light);
    color: var(--text-secondary);
    padding: 4px 12px;
    border-radius: var(--radius-large);
    font-size: 12px;
  }
}

.message-wrapper {
  display: flex;
  margin-bottom: 12px;
  
  &.sent {
    justify-content: flex-end;
    
    .message-content {
      align-items: flex-end;
    }
  }
  
  &.received {
    justify-content: flex-start;
    
    .message-content {
      align-items: flex-start;
    }
  }
}

.message-avatar {
  margin-right: 8px;
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.message-sender {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  padding-left: 12px;
}

.message-bubble {
  border-radius: var(--radius-large);
  padding: 8px 12px;
  position: relative;
  word-wrap: break-word;
  animation: messageSlideIn 0.3s ease-out;
  
  &.sent {
    background: var(--primary-color);
    color: white;
    margin-left: auto;
  }
  
  &.received {
    background: var(--bg-white);
    color: var(--text-primary);
    border: 1px solid var(--border-light);
  }
}

.message-text {
  line-height: 1.4;
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: var(--transition-fast);
  
  &:hover {
    transform: scale(1.02);
  }
}

.message-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-base);
  cursor: pointer;
  
  .el-icon {
    font-size: 20px;
  }
}

.message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
}

.message-status {
  margin-left: 4px;
  
  .el-icon {
    font-size: 12px;
  }
  
  .status-sending {
    color: var(--text-secondary);
    animation: spin 1s linear infinite;
  }
  
  .status-sent {
    color: var(--text-secondary);
  }
  
  .status-delivered {
    color: var(--success-color);
  }
  
  .status-read {
    color: var(--primary-color);
  }
}

.typing-indicator-wrapper {
  margin-top: auto;
  padding-top: 8px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  margin-left: 40px;
}

.typing-dots {
  display: flex;
  gap: 2px;
}

.message-enter-active {
  transition: all 0.3s ease-out;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>