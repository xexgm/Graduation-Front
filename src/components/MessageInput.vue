<template>
  <div ref="inputRootRef" class="message-input">
    <div class="input-tools">
      <el-button type="text" class="emoji-tool" @click="showEmojiPanel = !showEmojiPanel">😊</el-button>
      <el-button type="text" :icon="Picture" @click="handleImageUpload" />
      <el-button type="text" :icon="Paperclip" @click="handleFileUpload" />
      <el-button
        type="text"
        :icon="Microphone"
        :class="{ 'is-recording': isRecording }"
        @click="toggleRecording"
      />
      <span v-if="isRecording" class="recording-tip">录音中 {{ recordingSeconds }}s，再次点击发送</span>
    </div>
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
    
    <div class="input-area">
      <el-input
        v-model="inputText"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 4 }"
        placeholder="输入消息..."
        class="message-textarea"
        @keydown="handleKeydown"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
      />
      
      <el-button
        type="primary"
        :icon="Position"
        circle
        size="large"
        class="send-btn"
        :disabled="!inputText.trim()"
        @click="handleSend"
      />
    </div>
    
    <!-- 隐藏的文件输入 -->
    <input
      ref="imageInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleImageChange"
    />
    <input
      ref="fileInputRef"
      type="file"
      style="display: none"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Picture, 
  Paperclip, 
  Microphone, 
  Position 
} from '@element-plus/icons-vue'
import { fileApi } from '@/api'
import { buildAudioMessageContent, buildFileMessageContent } from '@/utils/fileMessage'
import { builtInEmojiOptions, unicodeEmojiOptions } from '@/utils/emoji'
import type { Message } from '@/types'

const emit = defineEmits<{
  send: [content: string, type?: Message['type']]
}>()

const inputText = ref('')
const inputRootRef = ref<HTMLElement>()
const imageInputRef = ref<HTMLInputElement>()
const fileInputRef = ref<HTMLInputElement>()
const showEmojiPanel = ref(false)
const isTyping = ref(false)
const typingTimer = ref<number>()
const isRecording = ref(false)
const recordingSeconds = ref(0)
const mediaRecorder = ref<MediaRecorder | null>(null)
const mediaStream = ref<MediaStream | null>(null)
const audioChunks = ref<BlobPart[]>([])
const recordStartTime = ref(0)
const recordingTimer = ref<number | null>(null)
const maxRecordingSeconds = 60

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

const handleSend = () => {
  const content = inputText.value.trim()
  if (!content) return
  
  emit('send', content, 'text')
  inputText.value = ''
  showEmojiPanel.value = false
  stopTyping()
}

const insertEmoji = async (value: string) => {
  const textarea = inputRootRef.value?.querySelector('textarea')
  const start = textarea?.selectionStart ?? inputText.value.length
  const end = textarea?.selectionEnd ?? inputText.value.length
  inputText.value = `${inputText.value.slice(0, start)}${value}${inputText.value.slice(end)}`
  showEmojiPanel.value = false

  await nextTick()
  const nextCursor = start + value.length
  textarea?.focus()
  textarea?.setSelectionRange(nextCursor, nextCursor)
}

const handleInput = () => {
  startTyping()
  
  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
  }
  
  typingTimer.value = window.setTimeout(() => {
    stopTyping()
  }, 1000)
}

const handleFocus = () => {
  // 可以在这里添加聚焦逻辑
}

const handleBlur = () => {
  stopTyping()
}

const startTyping = () => {
  // 暂时移除 typing 功能，等待后端实现
}

const stopTyping = () => {
  // 暂时移除 typing 功能，等待后端实现
}

const handleImageUpload = () => {
  imageInputRef.value?.click()
}

const handleFileUpload = () => {
  fileInputRef.value?.click()
}

const getAudioMimeType = () => {
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return 'audio/webm;codecs=opus'
  }

  return 'audio/webm'
}

const uploadAndEmitFileMessage = async (file: File, successMessage: string) => {
  const response = await fileApi.upload(file)
  if (response.code !== 200 || !response.data) {
    throw new Error(response.message || '文件上传失败')
  }

  emit('send', buildFileMessageContent(response.data), 'file')
  ElMessage.success(successMessage)
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
    console.error('Start recording failed:', error)
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

    emit('send', buildAudioMessageContent(response.data, duration), 'audio')
    ElMessage.success('语音发送成功')
  } catch (error) {
    console.error('Audio upload failed:', error)
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

const handleImageChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  try {
    ElMessage.info('图片上传中...')
    await uploadAndEmitFileMessage(file, '图片发送成功')
  } catch (error) {
    console.error('Image upload failed:', error)
    ElMessage.error('图片上传失败')
  } finally {
    target.value = ''
  }
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  try {
    ElMessage.info('文件上传中...')
    await uploadAndEmitFileMessage(file, '文件发送成功')
  } catch (error) {
    console.error('File upload failed:', error)
    ElMessage.error('文件上传失败')
  } finally {
    target.value = ''
  }
}
</script>

<style scoped lang="scss">
.message-input {
  background: var(--workspace-panel-muted);
  border-top: 1px solid var(--workspace-border);
  padding: 16px 20px;
  position: relative;
  box-shadow: 0 -12px 30px rgba(15, 23, 42, 0.04);
}

.input-tools {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  
  .el-button {
    color: var(--text-secondary);
    font-size: 18px;
    border-radius: 12px;
    transition: transform 0.18s ease, color 0.18s ease, background 0.18s ease;
    
    &:hover {
      color: var(--primary-color);
      background: var(--workspace-card-hover);
      transform: translateY(-1px);
    }

    &.is-recording {
      color: var(--danger-color);
      background: rgba(245, 108, 108, 0.12);
    }
  }
}

.emoji-tool {
  font-size: 18px;
}

.emoji-panel {
  position: absolute;
  left: 20px;
  bottom: 116px;
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
  margin-bottom: 4px;
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

.recording-tip {
  display: inline-flex;
  align-items: center;
  color: var(--danger-color);
  font-size: 12px;
}

.input-area {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.message-textarea {
  flex: 1;
  
  :deep(.el-textarea__inner) {
    border-radius: 16px;
    border: 1px solid var(--workspace-border);
    padding: 12px 16px;
    color: var(--text-primary);
    background: var(--chat-input-bg);
    font-size: 14px;
    line-height: 1.4;
    resize: none;
    transition: var(--transition-all);
    
    &:focus {
      border-color: var(--primary-color);
      background: var(--chat-input-focus);
      box-shadow: 0 0 0 3px var(--workspace-glow);
    }
    
    &::placeholder {
      color: var(--text-placeholder);
    }
  }
}

.send-btn {
  width: 44px;
  height: 44px;
  background: var(--chat-bubble-sent);
  border: none;
  transition: var(--transition-all);
  box-shadow: 0 12px 24px var(--workspace-glow);
  
  &:hover:not(:disabled) {
    background: var(--chat-bubble-sent-hover);
    transform: translateY(-2px) scale(1.04);
    box-shadow: 0 16px 30px var(--workspace-glow-strong);
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }
  
  &:disabled {
    background: var(--border-base);
    color: var(--text-placeholder);
    transform: none;
    box-shadow: none;
  }
  
  .el-icon {
    font-size: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .input-tools .el-button,
  .emoji-pop-enter-active,
  .emoji-pop-leave-active,
  .emoji-option,
  .built-in-option,
  .send-btn {
    transition: none;
  }

  .input-tools .el-button:hover,
  .emoji-option:hover,
  .built-in-option:hover,
  .send-btn:hover:not(:disabled),
  .send-btn:active:not(:disabled) {
    transform: none;
  }
}
</style>