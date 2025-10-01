<template>
  <div class="chat-header">
    <div class="chat-info">
      <el-avatar :size="40" :src="room.avatar">
        {{ roomName[0] }}
      </el-avatar>
      <div class="chat-details">
        <div class="chat-name">{{ roomName }}</div>
        <div class="chat-status">
          <template v-if="room.type === 'private'">
            <span v-if="isOnline" class="online">在线</span>
            <span v-else class="offline">离线</span>
          </template>
          <template v-else>
            {{ room.participants.length }} 人
          </template>
        </div>
      </div>
    </div>
    
    <div class="chat-actions">
      <el-button type="text" :icon="VideoCamera" />
      <el-button type="text" :icon="Phone" />
      <el-button type="text" :icon="MoreFilled" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VideoCamera, Phone, MoreFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import type { ChatRoom } from '@/types'

const props = defineProps<{
  room: ChatRoom
}>()

const userStore = useUserStore()
const chatStore = useChatStore()

const roomName = computed(() => {
  if (props.room.name) return props.room.name
  if (props.room.type === 'private') {
    const otherUser = props.room.participants.find(p => p.id !== userStore.user?.id)
    return otherUser?.nickname || otherUser?.username || '未知用户'
  }
  return '群聊'
})

const isOnline = computed(() => {
  if (props.room.type === 'private') {
    const otherUser = props.room.participants.find(p => p.id !== userStore.user?.id)
    return otherUser ? chatStore.onlineUsers.has(otherUser.id) : false
  }
  return false
})
</script>

<style scoped lang="scss">
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-light);
}

.chat-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-details {
  .chat-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 16px;
  }
  
  .chat-status {
    font-size: 12px;
    margin-top: 2px;
    
    .online {
      color: var(--success-color);
    }
    
    .offline {
      color: var(--text-secondary);
    }
  }
}

.chat-actions {
  display: flex;
  gap: 4px;
  
  .el-button {
    font-size: 18px;
    color: var(--text-secondary);
    
    &:hover {
      color: var(--primary-color);
    }
  }
}
</style>