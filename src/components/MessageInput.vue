<template>
  <div class="message-input">
    <div class="input-tools">
      <el-button type="text" :icon="Picture" @click="handleImageUpload" />
      <el-button type="text" :icon="Paperclip" @click="handleFileUpload" />
      <el-button type="text" :icon="Microphone" />
    </div>
    
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
import { useChatStore } from '@/stores/chat'
import { chatApi } from '@/api'

const emit = defineEmits<{
  send: [content: string, type?: string]
}>()

const chatStore = useChatStore()
const inputText = ref('')
const imageInputRef = ref<HTMLInputElement>()
const fileInputRef = ref<HTMLInputElement>()
const isTyping = ref(false)
const typingTimer = ref<number>()

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
  stopTyping()
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
  if (!isTyping.value) {
    isTyping.value = true
    chatStore.sendTyping(true)
  }
}

const stopTyping = () => {
  if (isTyping.value) {
    isTyping.value = false
    chatStore.sendTyping(false)
  }
}

const handleImageUpload = () => {
  imageInputRef.value?.click()
}

const handleFileUpload = () => {
  fileInputRef.value?.click()
}

const handleImageChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    ElMessage.info('图片上传中...')
    const response = await chatApi.uploadFile(file)
    const imageUrl = response.data.url
    
    emit('send', imageUrl, 'image')
    ElMessage.success('图片发送成功')
  } catch (error) {
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
    const formData = new FormData()
    formData.append('file', file)
    
    ElMessage.info('文件上传中...')
    const response = await chatApi.uploadFile(file)
    const fileUrl = response.data.url
    
    emit('send', `${file.name}|${fileUrl}`, 'file')
    ElMessage.success('文件发送成功')
  } catch (error) {
    ElMessage.error('文件上传失败')
  } finally {
    target.value = ''
  }
}
</script>

<style scoped lang="scss">
.message-input {
  background: var(--bg-white);
  border-top: 1px solid var(--border-light);
  padding: 16px 20px;
}

.input-tools {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  
  .el-button {
    color: var(--text-secondary);
    font-size: 18px;
    
    &:hover {
      color: var(--primary-color);
      background: var(--bg-light);
    }
  }
}

.input-area {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.message-textarea {
  flex: 1;
  
  :deep(.el-textarea__inner) {
    border-radius: var(--radius-large);
    border: 1px solid var(--border-light);
    padding: 12px 16px;
    font-size: 14px;
    line-height: 1.4;
    resize: none;
    transition: var(--transition-all);
    
    &:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
    }
    
    &::placeholder {
      color: var(--text-placeholder);
    }
  }
}

.send-btn {
  width: 44px;
  height: 44px;
  background: var(--primary-color);
  border: none;
  transition: var(--transition-all);
  
  &:hover:not(:disabled) {
    background: var(--primary-color);
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
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
</style>