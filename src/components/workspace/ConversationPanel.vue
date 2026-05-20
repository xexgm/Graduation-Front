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
      <div class="empty-hero">
        <div class="hero-mark">
          <span class="minimal-logo"></span>
        </div>
        <h2>光芒IM</h2>
        <p>选择一个会话开始沟通，或进入聊天室连接更多人。</p>
        <div class="hero-tags">
          <span>实时通信</span>
          <span>语音转写</span>
          <span>文件传输</span>
        </div>
      </div>
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
  overflow: hidden;
  border: 1px solid var(--workspace-border);
  border-radius: 24px;
  background: var(--workspace-panel);
  box-shadow: var(--workspace-shadow);
  backdrop-filter: blur(22px);
}

.empty-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 32px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    width: 360px;
    height: 360px;
    border-radius: 999px;
    background: radial-gradient(circle, var(--workspace-glow), transparent 68%);
    filter: blur(10px);
  }
}

.empty-hero {
  position: relative;
  max-width: 420px;
  text-align: center;
  padding: 36px;
  border: 1px solid var(--workspace-border);
  border-radius: 28px;
  background: var(--workspace-card);
  box-shadow: var(--workspace-shadow);

  h2 {
    margin: 16px 0 10px;
    font-size: 34px;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-primary);
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.8;
  }
}

.hero-mark {
  width: 74px;
  height: 74px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
  box-shadow: 0 20px 44px var(--workspace-glow);
}

.minimal-logo {
  position: relative;
  width: 34px;
  height: 34px;
  border: 3px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;

  &::before {
    content: '';
    position: absolute;
    right: -5px;
    bottom: 2px;
    width: 12px;
    height: 12px;
    border-right: 3px solid rgba(255, 255, 255, 0.92);
    border-bottom: 3px solid rgba(255, 255, 255, 0.92);
    transform: rotate(10deg);
  }

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.85);
    transform: translate(-50%, -50%);
  }
}

.hero-tags {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;

  span {
    padding: 6px 10px;
    border: 1px solid var(--workspace-border);
    border-radius: 999px;
    color: var(--text-secondary);
    background: var(--workspace-panel-muted);
    font-size: 12px;
  }
}
</style>

