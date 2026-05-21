<template>
  <div class="message-list scrollbar-thin" ref="messageListRef">
    <div ref="messageContainerRef" class="messages-container">
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
                <el-avatar :size="32" :src="getSenderAvatar(message.senderId)" @click="openSenderProfile(message.senderId)">
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
                    <div class="message-text" v-html="renderMessageContent(message.content)" />
                  </template>
                  <template v-else-if="message.type === 'image'">
                    <img :src="message.content" class="message-image" @click="previewImage(message.content)" />
                  </template>
                  <template v-else-if="message.type === 'file'">
                    <div class="message-file" @click="downloadFile(message)">
                      <el-icon><Document /></el-icon>
                      <div class="file-info">
                        <span class="file-name">{{ getFileName(message) }}</span>
                        <span class="file-size">{{ getFileSize(message) }}</span>
                      </div>
                      <el-icon class="file-download"><Download /></el-icon>
                    </div>
                  </template>
                  <template v-else-if="message.type === 'audio'">
                    <div class="message-audio-wrap">
                      <div class="message-audio-row">
                        <div class="message-audio" @click="playAudio(message)">
                          <el-icon><VideoPlay /></el-icon>
                          <span>{{ getAudioDuration(message) }}</span>
                        </div>
                        <button
                          class="transcription-pill"
                          :disabled="getTranscriptionState(message)?.loading"
                          @click.stop="toggleTranscription(message)"
                        >
                          {{ getTranscriptionButtonText(message) }}
                        </button>
                      </div>
                      <div v-if="getTranscriptionState(message)?.expanded && getTranscriptionState(message)?.text" class="transcription-text">
                        {{ getTranscriptionState(message)?.text }}
                      </div>
                      <div v-else-if="getTranscriptionState(message)?.expanded && getTranscriptionState(message)?.error" class="transcription-error">
                        {{ getTranscriptionState(message)?.error }}
                      </div>
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
      <div ref="bottomAnchorRef" class="bottom-anchor"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Document, Loading, Check, Select, Download, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useVoiceTranscriptionStore } from '@/stores/voiceTranscription'
import { fileApi } from '@/api'
import { formatAudioDuration, formatFileSize, parseAudioMessageContent, parseFileMessageContent } from '@/utils/fileMessage'
import { renderMessageContent } from '@/utils/emoji'
import { toApiAssetUrl } from '@/utils/url'
import type { ChatRoom, Message } from '@/types'

const props = defineProps<{
  room: ChatRoom
}>()

const userStore = useUserStore()
const chatStore = useChatStore()
const voiceTranscriptionStore = useVoiceTranscriptionStore()
const router = useRouter()
const messageListRef = ref<HTMLElement>()
const messageContainerRef = ref<HTMLElement>()
const bottomAnchorRef = ref<HTMLElement>()

const currentUserId = computed(() => String(userStore.user?.userId || ''))

const messages = computed(() => chatStore.currentMessages)

const messageSignature = computed(() => {
  return messages.value.map(message => `${message.id}:${message.msgId || ''}`).join('|')
})

const typingUsers = computed(() => {
  // 暂时移除 typingUsers 功能，等待后端实现
  return []
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
  const id = parseInt(senderId)
  const user = chatStore.getUserById?.(id)
  if (user) return user.nickname || user.username
  const sender = props.room.participants.find(p => p.userId.toString() === senderId)
  return sender?.nickname || sender?.username || `用户${senderId}`
}

const getSenderAvatar = (senderId: string) => {
  const id = parseInt(senderId)
  const user = chatStore.getUserById?.(id)
  if (user) return toApiAssetUrl(user.avatarUrl)
  const sender = props.room.participants.find(p => p.userId.toString() === senderId)
  return toApiAssetUrl(sender?.avatarUrl)
}

const getSenderUserNo = (senderId: string) => {
  const id = parseInt(senderId)
  const user = chatStore.getUserById?.(id)
  if (user?.userNo) return user.userNo
  const sender = props.room.participants.find(p => p.userId.toString() === senderId)
  return sender?.userNo
}

const openSenderProfile = (senderId: string) => {
  const userNo = getSenderUserNo(senderId)
  if (!userNo) {
    ElMessage.warning('该用户暂无用户编号')
    return
  }
  router.push(`/profile/${userNo}`)
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

const getFileInfo = (message: Message) => {
  return message.fileInfo || parseFileMessageContent(message.content)
}

const getFileName = (message: Message) => {
  return getFileInfo(message)?.fileName || '未知文件'
}

const getFileSize = (message: Message) => {
  const fileInfo = getFileInfo(message)
  return fileInfo ? formatFileSize(fileInfo.fileSize) : '未知大小'
}

const downloadFile = async (message: Message) => {
  const fileInfo = getFileInfo(message)
  if (!fileInfo) {
    ElMessage.error('文件信息无效，无法下载')
    return
  }

  try {
    const blob = await fileApi.download(fileInfo.fileId)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileInfo.fileName
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download file failed:', error)
    ElMessage.error('文件下载失败')
  }
}

const getAudioInfo = (message: Message) => {
  return message.audioInfo || parseAudioMessageContent(message.content)
}

const getAudioDuration = (message: Message) => {
  return formatAudioDuration(getAudioInfo(message)?.duration || 0)
}

const getTranscriptionState = (message: Message) => {
  return voiceTranscriptionStore.getState(getAudioInfo(message)?.fileId)
}

const toggleTranscription = async (message: Message) => {
  const audioInfo = getAudioInfo(message)
  if (!audioInfo?.fileId) {
    ElMessage.error('语音信息无效，无法转文字')
    return
  }

  await voiceTranscriptionStore.toggle(audioInfo.fileId)
}

const getTranscriptionButtonText = (message: Message) => {
  return voiceTranscriptionStore.getButtonText(getAudioInfo(message)?.fileId)
}

const playAudio = async (message: Message) => {
  const audioInfo = getAudioInfo(message)
  if (!audioInfo) {
    ElMessage.error('语音信息无效，无法播放')
    return
  }

  try {
    const blob = await fileApi.download(audioInfo.fileId)
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => URL.revokeObjectURL(url)
    await audio.play()
  } catch (error) {
    console.error('Play audio failed:', error)
    ElMessage.error('语音播放失败')
  }
}

const scrollToBottom = async () => {
  await nextTick()
  const getScrollTarget = () => {
    const anchorOffset = bottomAnchorRef.value?.offsetTop
    return Math.max(anchorOffset || 0, messageListRef.value?.scrollHeight || 0, 999999)
  }

  const scroll = () => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = getScrollTarget()
    }
    bottomAnchorRef.value?.scrollIntoView({ block: 'end' })
  }

  scroll()

  let frameCount = 0
  const retryByFrame = () => {
    scroll()
    frameCount++
    if (frameCount < 12) {
      requestAnimationFrame(retryByFrame)
    }
  }
  requestAnimationFrame(retryByFrame)

  const retryTimer = window.setInterval(scroll, 80)
  window.setTimeout(() => clearInterval(retryTimer), 1000)

  if (messageContainerRef.value && typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => scroll())
    observer.observe(messageContainerRef.value)
    window.setTimeout(() => observer.disconnect(), 1000)
  }
}

watch(messageSignature, () => {
  scrollToBottom()
}, { flush: 'post' })

watch(() => props.room.id, () => {
  scrollToBottom()
}, { flush: 'post' })

onMounted(() => {
  scrollToBottom()
})

// 确保消息涉及的用户资料已加载（用于显示用户名/头像）
watch(messages, (list) => {
  const ids = new Set<number>()
  list.forEach(m => {
    const id = parseInt(m.senderId as string)
    if (!Number.isNaN(id)) ids.add(id)
  })
  ids.forEach(id => chatStore.ensureUserLoaded?.(id))
}, { deep: true, immediate: true })
</script>

<style scoped lang="scss">
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background:
    radial-gradient(circle at 18% 10%, var(--chat-surface-glow), transparent 26%),
    var(--chat-surface-muted);
}

.messages-container {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.bottom-anchor {
  height: 1px;
  flex: 0 0 auto;
}

.date-divider {
  text-align: center;
  margin: 16px 0;
  
  span {
    background: var(--workspace-panel-muted);
    color: var(--text-secondary);
    padding: 5px 12px;
    border-radius: var(--radius-large);
    border: 1px solid var(--workspace-border);
    font-size: 12px;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
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
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.2s ease;

  &:hover {
    transform: translateY(-1px) scale(1.04);
    filter: drop-shadow(0 8px 14px var(--workspace-glow));
  }
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
  padding: 9px 13px;
  position: relative;
  word-wrap: break-word;
  animation: messageSlideIn 0.3s ease-out;
  box-shadow: var(--chat-bubble-shadow);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  
  &.sent {
    background: var(--chat-bubble-sent);
    color: white;
    margin-left: auto;

    &:hover {
      background: var(--chat-bubble-sent-hover);
    }
  }
  
  &.received {
    background: var(--chat-bubble-received);
    color: var(--text-primary);
    border: 1px solid var(--workspace-border);

    &:hover {
      background: var(--chat-bubble-received-hover);
    }
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 30px var(--workspace-glow);
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
  background: var(--workspace-panel-muted);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;

  &:hover {
    background: var(--workspace-card-hover);
    transform: translateY(-1px);
  }
  
  .el-icon {
    font-size: 20px;
  }

  .file-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .file-name {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-size: 12px;
    opacity: 0.75;
  }

  .file-download {
    margin-left: auto;
    font-size: 16px;
  }
}

.message-audio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 88px;
  padding: 6px 8px;
  border-radius: var(--radius-base);
  background: var(--workspace-panel-muted);
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;

  &:hover {
    background: var(--workspace-card-hover);
    transform: translateY(-1px);
  }

  .el-icon {
    font-size: 18px;
  }
}

.message-audio-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message-audio-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.transcription-pill {
  height: 26px;
  padding: 0 12px;
  border: 1px solid var(--workspace-border);
  border-radius: 999px;
  color: inherit;
  background: var(--workspace-panel-muted);
  font-size: 12px;
  line-height: 24px;
  cursor: pointer;
  white-space: nowrap;
  transition: var(--transition-fast);
}

.transcription-pill:hover:not(:disabled) {
  background: var(--workspace-card-hover);
}

.transcription-pill:disabled {
  cursor: wait;
  opacity: 0.7;
}

.transcription-text,
.transcription-error {
  max-width: 240px;
  padding: 6px 8px;
  border-radius: var(--radius-base);
  font-size: 13px;
  line-height: 1.5;
  background: var(--workspace-panel-muted);
}

.transcription-error {
  color: var(--danger-color);
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

@media (prefers-reduced-motion: reduce) {
  .message-avatar,
  .message-bubble,
  .message-file,
  .message-audio,
  .message-enter-active {
    animation: none;
    transition: none;
  }

  .message-avatar:hover,
  .message-bubble:hover,
  .message-file:hover,
  .message-audio:hover {
    transform: none;
  }
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
