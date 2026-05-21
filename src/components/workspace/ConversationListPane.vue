<template>
  <div class="conversation-pane">
    <div class="pane-header">
      <div class="title">会话</div>
      <el-button size="small" @click="refreshAll" :loading="refreshing">刷新</el-button>
    </div>

    <div class="search-wrap">
      <el-input v-model="keyword" placeholder="搜索会话..." clearable />
    </div>

    <el-scrollbar class="list-wrap">
      <div
        v-for="item in filteredConversations"
        :key="item.conversationId"
        class="conversation-item"
        :class="{ active: conversationStore.activeConversationKey === item.conversationId }"
        @click="open(item)"
      >
        <el-avatar :size="40" :src="item.avatar">
          {{ item.title?.[0] || '?' }}
        </el-avatar>
        <div class="meta">
          <div class="top-row">
            <span class="name">{{ item.title }}</span>
            <span class="time">{{ formatTime(item.lastMessageTime) }}</span>
          </div>
          <div class="bottom-row">
            <span class="preview">{{ item.lastMessage || '暂无消息' }}</span>
            <el-badge v-if="item.unreadCount > 0" :value="item.unreadCount" :max="99" />
          </div>
        </div>
      </div>

      <div v-if="filteredConversations.length === 0" class="empty-state">
        <el-empty description="暂无会话" :image-size="80" />
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import type { Conversation } from '@/types'
import { useConversationStore } from '@/stores/conversation'
import { useFriendStore } from '@/stores/friend'
import { useChatStore } from '@/stores/chat'

const conversationStore = useConversationStore()
const friendStore = useFriendStore()
const chatStore = useChatStore()

const keyword = ref('')
const refreshing = ref(false)

const filteredConversations = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  if (!key) return conversationStore.conversations
  return conversationStore.conversations.filter((item) => item.title.toLowerCase().includes(key))
})

const formatTime = (time?: Date) => {
  if (!time) return ''
  return dayjs(time).format('HH:mm')
}

const open = async (item: Conversation) => {
  await conversationStore.openConversation(item)
}

const refreshAll = async () => {
  try {
    refreshing.value = true
    await Promise.all([friendStore.fetchFriends(), chatStore.fetchRooms()])
  } finally {
    refreshing.value = false
  }
}
</script>

<style scoped lang="scss">
.conversation-pane {
  width: 330px;
  border: 1px solid var(--workspace-border);
  border-radius: 24px;
  position: relative;
  background: var(--workspace-panel);
  box-shadow: var(--workspace-shadow);
  backdrop-filter: blur(22px);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, var(--chat-surface-glow), transparent 36%);
    opacity: 0.72;
    pointer-events: none;
  }

  > * {
    position: relative;
    z-index: 1;
  }
}

.pane-header {
  padding: 18px 16px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--workspace-border);
}

.title {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
}

.search-wrap {
  padding: 12px 14px;

  :deep(.el-input__wrapper) {
    border: 1px solid var(--workspace-border);
    border-radius: 14px;
    background: var(--workspace-input);
    box-shadow: none;
    transition: var(--transition-all);

    &:hover,
    &.is-focus {
      border-color: var(--brand-primary);
      background: var(--chat-input-focus);
      box-shadow: 0 0 0 3px var(--workspace-glow);
    }
  }
}

.list-wrap {
  flex: 1;
  padding: 0 10px 12px;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  margin-bottom: 8px;
  background: transparent;
  transition: var(--transition-all);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, var(--workspace-glow), transparent 55%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .el-avatar,
  .meta {
    position: relative;
    z-index: 1;
  }

  .el-avatar {
    transition: transform 0.24s ease, box-shadow 0.24s ease;
  }

  &:hover {
    border-color: var(--workspace-border);
    background: var(--workspace-card-hover);
    transform: translateY(-2px);
    box-shadow: var(--workspace-shadow-hover);

    &::before {
      opacity: 1;
    }

    .el-avatar {
      transform: scale(1.04);
      box-shadow: 0 8px 18px var(--workspace-glow);
    }
  }

  &.active {
    border-color: rgba(59, 130, 246, 0.24);
    background: var(--workspace-card-active);
    box-shadow: 0 12px 28px var(--workspace-glow);

    &::before {
      opacity: 1;
    }

    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 18%;
      width: 3px;
      height: 64%;
      border-radius: 999px;
      background: linear-gradient(180deg, var(--brand-primary), var(--brand-accent));
    }
  }
}

.meta {
  flex: 1;
  min-width: 0;
}

.top-row,
.bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.name {
  font-weight: 600;
  color: var(--text-primary);
}

.time {
  font-size: 12px;
  color: var(--text-secondary);
}

.preview {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-state {
  padding-top: 30px;
}

@media (prefers-reduced-motion: reduce) {
  .search-wrap :deep(.el-input__wrapper),
  .conversation-item,
  .conversation-item::before,
  .conversation-item .el-avatar {
    transition: none;
  }

  .conversation-item:hover,
  .conversation-item:hover .el-avatar {
    transform: none;
  }
}
</style>

