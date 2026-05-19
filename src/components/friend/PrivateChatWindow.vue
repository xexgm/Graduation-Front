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
              <template v-if="msg.type === 'file'">
                <div class="private-file-card" @click="downloadFile(msg)">
                  <el-icon><Document /></el-icon>
                  <div class="file-info">
                    <span class="file-name">{{ getFileName(msg) }}</span>
                    <span class="file-size">{{ getFileSize(msg) }}</span>
                  </div>
                  <el-icon class="file-download"><Download /></el-icon>
                </div>
              </template>
              <template v-else-if="msg.type === 'audio'">
                <div class="private-audio-card" @click="playAudio(msg)">
                  <el-icon><VideoPlay /></el-icon>
                  <span>{{ getAudioDuration(msg) }}</span>
                </div>
              </template>
              <template v-else>
                {{ msg.content }}
              </template>
            </div>
            <div class="msg-meta">
              <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
              <template v-if="isMyMessage(msg.senderId)">
                <el-button
                  v-if="msg.status === 'failed'"
                  text
                  size="small"
                  type="danger"
                  class="retry-btn"
                  @click="retryMessage(msg)"
                >
                  重发
                </el-button>
                <span class="msg-status" :class="`status-${msg.status}`">
                  {{ formatMessageStatus(msg.status) }}
                </span>
              </template>
            </div>
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
        <el-button :icon="Paperclip" @click="handleFileSelect">
          文件
        </el-button>
        <el-button :icon="Microphone" :class="{ 'is-recording': isRecording }" @click="toggleRecording">
          {{ isRecording ? `录音中 ${recordingSeconds}s` : '语音' }}
        </el-button>
        <el-button type="primary" :disabled="!inputContent.trim()" @click="handleSend">
          发送
        </el-button>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        style="display: none"
        @change="handleFileChange"
      />
    </div>
  </div>
  <div v-else class="empty-chat-selection">
    <el-empty description="点击左侧好友开始聊天" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useFriendStore } from '@/stores/friend'
import { useUserStore } from '@/stores/user'
import { fileApi } from '@/api'
import {
  buildAudioMessageContent,
  buildFileMessageContent,
  formatAudioDuration,
  formatFileSize,
  parseAudioMessageContent,
  parseFileMessageContent
} from '@/utils/fileMessage'
import { Document, Download, Microphone, Paperclip, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { Message } from '@/types'
import dayjs from 'dayjs'

const friendStore = useFriendStore()
const userStore = useUserStore()

const inputContent = ref('')
const scrollbarRef = ref()
const fileInputRef = ref<HTMLInputElement>()
const isRecording = ref(false)
const recordingSeconds = ref(0)
const mediaRecorder = ref<MediaRecorder | null>(null)
const mediaStream = ref<MediaStream | null>(null)
const audioChunks = ref<BlobPart[]>([])
const recordStartTime = ref(0)
const recordingTimer = ref<number | null>(null)
const maxRecordingSeconds = 60

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

const formatMessageStatus = (status: Message['status']) => {
  const statusMap: Record<Message['status'], string> = {
    sending: '发送中',
    failed: '发送失败',
    sent: '已发送',
    delivered: '已送达',
    read: '已读'
  }

  return statusMap[status] || ''
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

const getAudioInfo = (message: Message) => {
  return message.audioInfo || parseAudioMessageContent(message.content)
}

const getAudioDuration = (message: Message) => {
  return formatAudioDuration(getAudioInfo(message)?.duration || 0)
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

watch(messages, async () => {
  if (friendStore.activeFriendId !== null) {
    await friendStore.markConversationRead(friendStore.activeFriendId)
  }
}, { deep: true, flush: 'post' })

const handleSend = async () => {
  const content = inputContent.value.trim()
  if (!content) return
  
  await friendStore.sendPrivateMessage(content)
  inputContent.value = ''
  scrollToBottom()
}

const retryMessage = async (message: Message) => {
  try {
    await friendStore.retryPrivateMessage(message)
  } catch (error) {
    console.error('Retry private message failed:', error)
    ElMessage.error('重发失败')
  }
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && friendStore.activeFriendId !== null) {
    friendStore.markConversationRead(friendStore.activeFriendId).catch(() => {})
  }
}

const handleFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    ElMessage.info('文件上传中...')
    const response = await fileApi.upload(file)
    if (response.code !== 200 || !response.data) {
      throw new Error(response.message || '文件上传失败')
    }

    await friendStore.sendPrivateMessage(buildFileMessageContent(response.data), 'file')
    ElMessage.success('文件发送成功')
    scrollToBottom()
  } catch (error) {
    console.error('Private file upload failed:', error)
    ElMessage.error('文件上传失败')
  } finally {
    target.value = ''
  }
}

const getAudioMimeType = () => {
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return 'audio/webm;codecs=opus'
  }

  return 'audio/webm'
}

const startRecording = async () => {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    ElMessage.error('当前浏览器不支持录音')
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: getAudioMimeType() })
    audioChunks.value = []
    mediaStream.value = stream
    mediaRecorder.value = recorder
    recordStartTime.value = Date.now()
    recordingSeconds.value = 0

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.value.push(event.data)
      }
    }

    recorder.onstop = async () => {
      await uploadRecordedAudio(recorder.mimeType || 'audio/webm')
    }

    recorder.start()
    isRecording.value = true
    recordingTimer.value = window.setInterval(() => {
      recordingSeconds.value = Math.ceil((Date.now() - recordStartTime.value) / 1000)
      if (recordingSeconds.value >= maxRecordingSeconds) {
        stopRecording()
      }
    }, 500)
  } catch (error) {
    console.error('Private start recording failed:', error)
    ElMessage.error('请允许浏览器访问麦克风后再发送语音')
    releaseRecordingResources()
  }
}

const stopRecording = () => {
  if (!mediaRecorder.value || mediaRecorder.value.state === 'inactive') {
    return
  }

  mediaRecorder.value.stop()
  isRecording.value = false
  if (recordingTimer.value !== null) {
    clearInterval(recordingTimer.value)
    recordingTimer.value = null
  }
}

const releaseRecordingResources = () => {
  mediaStream.value?.getTracks().forEach(track => track.stop())
  mediaStream.value = null
  mediaRecorder.value = null
  if (recordingTimer.value !== null) {
    clearInterval(recordingTimer.value)
    recordingTimer.value = null
  }
}

const uploadRecordedAudio = async (mimeType: string) => {
  const duration = Math.ceil((Date.now() - recordStartTime.value) / 1000)
  const blob = new Blob(audioChunks.value, { type: mimeType || 'audio/webm' })
  releaseRecordingResources()

  if (duration < 1 || blob.size === 0) {
    ElMessage.warning('录音时间太短')
    return
  }

  try {
    ElMessage.info('语音上传中...')
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' })
    const response = await fileApi.upload(file)
    if (response.code !== 200 || !response.data) {
      throw new Error(response.message || '语音上传失败')
    }

    await friendStore.sendPrivateMessage(buildAudioMessageContent(response.data, duration), 'audio')
    ElMessage.success('语音发送成功')
    scrollToBottom()
  } catch (error) {
    console.error('Private audio upload failed:', error)
    ElMessage.error('语音发送失败')
  }
}

const toggleRecording = () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
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
    console.error('Private file download failed:', error)
    ElMessage.error('文件下载失败')
  }
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
    console.error('Private audio play failed:', error)
    ElMessage.error('语音播放失败')
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
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

.msg-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.message-mine .msg-meta {
  justify-content: flex-end;
}

.msg-time,
.msg-status {
  font-size: 11px;
  color: var(--text-placeholder);
}

.status-failed {
  color: var(--danger-color);
}

.status-read {
  color: var(--primary-color);
}

.retry-btn {
  height: 18px;
  padding: 0;
  font-size: 11px;
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
  gap: 8px;
  margin-top: 12px;

  .is-recording {
    color: var(--danger-color);
    border-color: var(--danger-color);
  }
}

.private-file-card {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 220px;
  cursor: pointer;

  .el-icon {
    font-size: 20px;
  }

  .file-info {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-size: 12px;
    opacity: 0.75;
  }

  .file-download {
    font-size: 16px;
  }
}

.private-audio-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 88px;
  cursor: pointer;

  .el-icon {
    font-size: 18px;
  }
}
</style>
