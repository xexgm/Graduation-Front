<template>
  <div class="private-chat-window" v-if="activeFriend">
    <div class="chat-header">
      <div class="header-user-info">
        <el-avatar
          :size="40"
          :src="toApiAssetUrl(activeFriend.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${activeFriend.nickname}`"
          class="clickable-avatar"
          @click="openProfileForMessage(activeFriend.userId)"
        />
        <span class="header-name">{{ activeFriend.nickname || activeFriend.username }}</span>
      </div>
      <el-button size="small" @click="closeChat">关闭</el-button>
    </div>

    <el-scrollbar class="message-list" ref="scrollbarRef">
      <div ref="messageContainerRef" class="message-container">
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
            @click="openProfileForMessage(msg.senderId)"
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
                <div class="private-audio-wrap">
                  <div class="private-audio-row">
                    <div class="private-audio-card" @click="playAudio(msg)">
                      <el-icon><VideoPlay /></el-icon>
                      <span>{{ getAudioDuration(msg) }}</span>
                    </div>
                    <button
                      class="transcription-pill"
                      :disabled="getTranscriptionState(msg)?.loading"
                      @click.stop="toggleTranscription(msg)"
                    >
                      {{ getTranscriptionButtonText(msg) }}
                    </button>
                  </div>
                  <div v-if="getTranscriptionState(msg)?.expanded && getTranscriptionState(msg)?.text" class="transcription-text">
                    {{ getTranscriptionState(msg)?.text }}
                  </div>
                  <div v-else-if="getTranscriptionState(msg)?.expanded && getTranscriptionState(msg)?.error" class="transcription-error">
                    {{ getTranscriptionState(msg)?.error }}
                  </div>
                </div>
              </template>
              <template v-else>
                <span class="message-text" v-html="renderMessageContent(msg.content)" />
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
        <div ref="bottomAnchorRef" class="bottom-anchor"></div>
      </div>
    </el-scrollbar>

    <div ref="inputRootRef" class="chat-input-area">
      <el-input
        v-model="inputContent"
        type="textarea"
        :rows="3"
        placeholder="输入私聊消息，按 Enter 发送"
        resize="none"
        @keydown.enter.prevent="handleSend"
      />
      <Transition name="emoji-pop">
        <div v-if="showEmojiPanel" class="emoji-panel">
          <div class="emoji-section-title">常用 Emoji</div>
          <div class="emoji-grid">
            <button v-for="emoji in unicodeEmojiOptions" :key="emoji" class="emoji-option" @click="insertEmoji(emoji)">
              {{ emoji }}
            </button>
          </div>
          <div class="emoji-section-title">内置表情</div>
          <div class="built-in-grid">
            <button v-for="emoji in builtInEmojiOptions" :key="emoji.token" class="built-in-option" @click="insertEmoji(emoji.token)">
              <img :src="emoji.src" :alt="emoji.label" />
              <span>{{ emoji.label }}</span>
            </button>
          </div>
        </div>
      </Transition>
      <div class="input-actions">
        <el-button class="emoji-action" @click="showEmojiPanel = !showEmojiPanel">😊 表情</el-button>
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
import { useVoiceTranscriptionStore } from '@/stores/voiceTranscription'
import { useRouter } from 'vue-router'
import { fileApi } from '@/api'
import { toApiAssetUrl } from '@/utils/url'
import { builtInEmojiOptions, renderMessageContent, unicodeEmojiOptions } from '@/utils/emoji'
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
const voiceTranscriptionStore = useVoiceTranscriptionStore()
const router = useRouter()

const inputContent = ref('')
const scrollbarRef = ref()
const inputRootRef = ref<HTMLElement>()
const messageContainerRef = ref<HTMLElement>()
const bottomAnchorRef = ref<HTMLElement>()
const fileInputRef = ref<HTMLInputElement>()
const isRecording = ref(false)
const showEmojiPanel = ref(false)
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

const messageSignature = computed(() => {
  return messages.value.map(message => `${message.id}:${message.msgId || ''}`).join('|')
})

const isMyMessage = (senderId: string | number) => {
  return String(senderId) === String(userStore.user?.userId)
}

const getAvatarForMessage = (senderId: string | number) => {
  if (isMyMessage(senderId)) {
    return toApiAssetUrl(userStore.user?.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${userStore.user?.nickname}`
  }
  return toApiAssetUrl(activeFriend.value?.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${activeFriend.value?.nickname}`
}

const getNicknameForMessage = (senderId: string | number) => {
  if (isMyMessage(senderId)) return userStore.user?.nickname
  return activeFriend.value?.nickname || activeFriend.value?.username
}

const openProfileForMessage = (senderId: string | number) => {
  const userNo = isMyMessage(senderId) ? userStore.user?.userNo : activeFriend.value?.userNo
  if (!userNo) {
    ElMessage.warning('该用户暂无用户编号')
    return
  }
  router.push(`/profile/${userNo}`)
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

const getTranscriptionState = (message: Message) => {
  return voiceTranscriptionStore.getState(getAudioInfo(message)?.fileId)
}

const closeChat = () => {
  friendStore.activeFriendId = null
}

const scrollToBottom = async () => {
  await nextTick()
  const getScrollTarget = () => {
    const wrap = scrollbarRef.value?.wrapRef
    const anchorOffset = bottomAnchorRef.value?.offsetTop
    return Math.max(anchorOffset || 0, wrap?.scrollHeight || 0, 999999)
  }

  const scroll = () => {
    const target = getScrollTarget()
    const wrap = scrollbarRef.value?.wrapRef
    scrollbarRef.value?.setScrollTop?.(target)
    if (wrap) {
      wrap.scrollTop = target
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

watch(() => friendStore.activeFriendId, () => {
  scrollToBottom()
}, { flush: 'post' })

watch(messageSignature, () => {
  scrollToBottom()
}, { flush: 'post' })

watch(messageSignature, async () => {
  if (friendStore.activeFriendId !== null) {
    await friendStore.markConversationRead(friendStore.activeFriendId)
  }
}, { flush: 'post' })

const handleSend = async () => {
  const content = inputContent.value.trim()
  if (!content) return
  
  await friendStore.sendPrivateMessage(content)
  inputContent.value = ''
  showEmojiPanel.value = false
  scrollToBottom()
}

const insertEmoji = async (value: string) => {
  const textarea = inputRootRef.value?.querySelector('textarea')
  const start = textarea?.selectionStart ?? inputContent.value.length
  const end = textarea?.selectionEnd ?? inputContent.value.length
  inputContent.value = `${inputContent.value.slice(0, start)}${value}${inputContent.value.slice(end)}`
  showEmojiPanel.value = false

  await nextTick()
  const nextCursor = start + value.length
  textarea?.focus()
  textarea?.setSelectionRange(nextCursor, nextCursor)
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
  background:
    radial-gradient(circle at 18% 8%, var(--chat-surface-glow), transparent 26%),
    var(--chat-surface);
}

.empty-chat-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: var(--chat-surface-muted);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--workspace-border);
  background: var(--workspace-panel-muted);
  backdrop-filter: blur(18px);
  
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
  background:
    radial-gradient(circle at 86% 12%, var(--chat-surface-glow), transparent 28%),
    var(--chat-surface-muted);
}

.message-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bottom-anchor {
  height: 1px;
  flex: 0 0 auto;
}

.message-item {
  display: flex;
  gap: 12px;
  max-width: 80%;
  animation: privateMessageIn 0.28s ease-out;

  &.message-mine {
    align-self: flex-end;
    flex-direction: row-reverse;
    
    .msg-content-wrapper {
      align-items: flex-end;
    }
    
    .msg-bubble {
      background: var(--chat-bubble-sent);
      color: white;
      border-radius: 12px 0 12px 12px;

      &:hover {
        background: var(--chat-bubble-sent-hover);
      }
    }
  }
}

.msg-avatar,
.clickable-avatar {
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.2s ease;

  &:hover {
    transform: translateY(-1px) scale(1.04);
    filter: drop-shadow(0 8px 14px var(--workspace-glow));
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
  background: var(--chat-bubble-received);
  padding: 10px 14px;
  border-radius: 0 12px 12px 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  border: 1px solid var(--workspace-border);
  box-shadow: var(--chat-bubble-shadow);
  word-break: break-word;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;

  &:hover {
    background: var(--chat-bubble-received-hover);
    box-shadow: 0 14px 30px var(--workspace-glow);
    transform: translateY(-1px);
  }
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
  background: var(--workspace-panel-muted);
  border-top: 1px solid var(--workspace-border);
  position: relative;
  box-shadow: 0 -12px 30px rgba(15, 23, 42, 0.04);
  
  :deep(.el-textarea__inner) {
    color: var(--text-primary);
    background: var(--chat-input-bg);
    border: 1px solid var(--workspace-border);
    border-radius: 16px;
    box-shadow: none;
    transition: var(--transition-all);
    
    &:focus {
      border-color: var(--brand-primary);
      background: var(--chat-input-focus);
      box-shadow: 0 0 0 3px var(--workspace-glow);
    }

    &::placeholder {
      color: var(--text-placeholder);
    }
  }
}

.emoji-panel {
  position: absolute;
  left: 16px;
  bottom: 88px;
  z-index: 20;
  width: 280px;
  padding: 12px;
  border: 1px solid var(--workspace-border);
  border-radius: 16px;
  background: var(--workspace-panel-solid);
  box-shadow: var(--workspace-shadow);
  transform-origin: left bottom;
}

.emoji-pop-enter-active,
.emoji-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.emoji-pop-enter-from,
.emoji-pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

.emoji-section-title {
  margin: 4px 0 8px;
  color: var(--text-secondary);
  font-size: 12px;
}

.emoji-grid,
.built-in-grid {
  display: grid;
  gap: 8px;
}

.emoji-grid {
  grid-template-columns: repeat(6, 1fr);
}

.built-in-grid {
  grid-template-columns: repeat(2, 1fr);
}

.emoji-option,
.built-in-option {
  border: 1px solid var(--workspace-border);
  border-radius: 10px;
  background: var(--workspace-panel-muted);
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
}

.emoji-option {
  height: 34px;
  font-size: 20px;
}

.built-in-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  color: var(--text-primary);
  font-size: 12px;

  img {
    width: 24px;
    height: 24px;
    border-radius: 7px;
  }
}

.emoji-option:hover,
.built-in-option:hover {
  border-color: var(--brand-primary);
  background: var(--workspace-card-hover);
  transform: translateY(-1px);
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

  .el-button {
    border-radius: 12px;
    transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 10px 20px var(--workspace-glow);
    }
  }

  .el-button--primary {
    background: var(--chat-bubble-sent);
    border: none;
    box-shadow: 0 12px 24px var(--workspace-glow);

    &:hover:not(:disabled) {
      background: var(--chat-bubble-sent-hover);
      box-shadow: 0 16px 30px var(--workspace-glow-strong);
    }
  }
}

.private-file-card {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 220px;
  cursor: pointer;
  transition: transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
  }

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
  transition: transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
  }

  .el-icon {
    font-size: 18px;
  }
}

.private-audio-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.private-audio-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.transcription-pill {
  height: 26px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 999px;
  color: inherit;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
  line-height: 24px;
  cursor: pointer;
  white-space: nowrap;
  transition: var(--transition-fast);
}

.transcription-pill:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.22);
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
  background: rgba(255, 255, 255, 0.14);
}

.transcription-error {
  color: var(--danger-color);
}

@keyframes privateMessageIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .message-item,
  .msg-avatar,
  .clickable-avatar,
  .msg-bubble,
  .emoji-pop-enter-active,
  .emoji-pop-leave-active,
  .emoji-option,
  .built-in-option,
  .input-actions .el-button,
  .private-file-card,
  .private-audio-card {
    animation: none;
    transition: none;
  }

  .msg-avatar:hover,
  .clickable-avatar:hover,
  .msg-bubble:hover,
  .emoji-option:hover,
  .built-in-option:hover,
  .input-actions .el-button:hover:not(:disabled),
  .private-file-card:hover,
  .private-audio-card:hover {
    transform: none;
  }
}
</style>
