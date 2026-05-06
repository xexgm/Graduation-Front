<template>
  <div class="conversation-panel">
    <template v-if="active?.conversationType === 'private'">
      <PrivateChatWindow />
    </template>

    <template v-else-if="active?.conversationType === 'room' && currentRoom">
      <ChatHeader :room="currentRoom" />
      <MessageList :room="currentRoom" />
      <MessageInput @send="handleSendMessage" />
    </template>

    <div v-else class="empty-wrap">
      <el-empty description="选择一个会话开始聊天" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useConversationStore } from '@/stores/conversation'
import PrivateChatWindow from '@/components/friend/PrivateChatWindow.vue'
import ChatHeader from '@/components/ChatHeader.vue'
import MessageInput from '@/components/MessageInput.vue'
import MessageList from '@/components/MessageList.vue'
import type { Message } from '@/types'

const chatStore = useChatStore()
const conversationStore = useConversationStore()

const active = computed(() => conversationStore.activeConversation)
const currentRoom = computed(() => chatStore.currentRoom)

const handleSendMessage = async (content: string, type: Message['type'] = 'text') => {
  try {
    await chatStore.sendMessage(content, type)
  } catch (error) {
    ElMessage.error('发送消息失败')
  }
}
</script>

<style scoped lang="scss">
.conversation-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-lighter);
}

.empty-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bg-lighter);
}
</style>

