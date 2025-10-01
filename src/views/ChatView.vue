<template>
  <div class="chat-container">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="user-info">
          <el-avatar :size="40" :src="userStore.user?.avatar">
            {{ userStore.user?.nickname?.[0] || userStore.user?.username?.[0] }}
          </el-avatar>
          <div class="user-details">
            <div class="username">{{ userStore.user?.nickname || userStore.user?.username }}</div>
            <div class="status">在线</div>
          </div>
        </div>
        <div class="sidebar-actions">
          <el-button
            type="text"
            :icon="Moon"
            @click="themeStore.toggleTheme"
            class="theme-toggle"
          />
          <el-button
            type="text"
            :icon="Setting"
            @click="$router.push('/settings')"
          />
        </div>
      </div>

      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索对话..."
          :prefix-icon="Search"
          clearable
        />
      </div>

      <div class="room-list scrollbar-thin">
        <transition-group name="list" tag="div">
          <div
            v-for="room in filteredRooms"
            :key="room.id"
            class="room-item card-hover"
            :class="{ active: currentRoom?.id === room.id }"
            @click="selectRoom(room)"
          >
            <div class="room-avatar">
              <el-avatar :size="48" :src="room.avatar">
                {{ getRoomName(room)[0] }}
              </el-avatar>
              <div 
                v-if="room.type === 'private' && isUserOnline(room.participants[0]?.id)"
                class="online-indicator"
              />
            </div>
            <div class="room-info">
              <div class="room-header">
                <span class="room-name">{{ getRoomName(room) }}</span>
                <span class="last-time">{{ formatTime(room.lastMessage?.timestamp) }}</span>
              </div>
              <div class="room-footer">
                <span class="last-message">{{ room.lastMessage?.content || '暂无消息' }}</span>
                <el-badge
                  v-if="room.unreadCount > 0"
                  :value="room.unreadCount"
                  :max="99"
                  class="unread-badge"
                />
              </div>
            </div>
          </div>
        </transition-group>
      </div>
    </div>

    <!-- 聊天区域 -->
    <div class="chat-area">
      <template v-if="currentRoom">
        <ChatHeader :room="currentRoom" />
        <MessageList :room="currentRoom" />
        <MessageInput @send="handleSendMessage" />
      </template>
      <div v-else class="empty-chat">
        <div class="empty-content">
          <el-icon class="empty-icon"><ChatDotRound /></el-icon>
          <h3>选择一个对话开始聊天</h3>
          <p>从左侧选择一个联系人或群组开始对话</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Search, 
  Setting, 
  Moon, 
  ChatDotRound 
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useThemeStore } from '@/stores/theme'
import type { ChatRoom } from '@/types'
import ChatHeader from '@/components/ChatHeader.vue'
import MessageList from '@/components/MessageList.vue'
import MessageInput from '@/components/MessageInput.vue'

const userStore = useUserStore()
const chatStore = useChatStore()
const themeStore = useThemeStore()

const searchKeyword = ref('')
const currentRoom = computed(() => chatStore.currentRoom)

const filteredRooms = computed(() => {
  if (!searchKeyword.value) return chatStore.rooms
  
  return chatStore.rooms.filter((room: ChatRoom) => {
    const roomName = getRoomName(room)
    return roomName.toLowerCase().includes(searchKeyword.value.toLowerCase())
  })
})

const getRoomName = (room: ChatRoom) => {
  if (room.name) return room.name
  if (room.type === 'private') {
    const otherUser = room.participants.find(p => p.id !== userStore.user?.id)
    return otherUser?.nickname || otherUser?.username || '未知用户'
  }
  return '群聊'
}

const isUserOnline = (userId: string) => {
  return chatStore.onlineUsers.has(userId)
}

const formatTime = (timestamp?: Date) => {
  if (!timestamp) return ''
  
  const now = dayjs()
  const time = dayjs(timestamp)
  
  if (now.diff(time, 'day') === 0) {
    return time.format('HH:mm')
  } else if (now.diff(time, 'day') === 1) {
    return '昨天'
  } else if (now.diff(time, 'year') === 0) {
    return time.format('MM-DD')
  } else {
    return time.format('YYYY-MM-DD')
  }
}

const selectRoom = async (room: ChatRoom) => {
  try {
    chatStore.setCurrentRoom(room)
    await chatStore.fetchMessages(room.id)
  } catch (error: any) {
    ElMessage.error('加载消息失败')
  }
}

const handleSendMessage = async (content: string) => {
  try {
    await chatStore.sendMessage(content)
  } catch (error: any) {
    ElMessage.error('发送消息失败')
  }
}

onMounted(async () => {
  try {
    await chatStore.fetchRooms()
  } catch (error: any) {
    ElMessage.error('加载对话列表失败')
  }
})
</script>

<style scoped lang="scss">
.chat-container {
  display: flex;
  height: 100vh;
  background: var(--bg-lighter);
}

.sidebar {
  width: 320px;
  background: var(--bg-white);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-details {
  .username {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 14px;
  }
  
  .status {
    font-size: 12px;
    color: var(--success-color);
  }
}

.sidebar-actions {
  display: flex;
  gap: 4px;
  
  .theme-toggle {
    font-size: 18px;
  }
}

.search-bar {
  padding: 16px;
  
  :deep(.el-input__inner) {
    border-radius: var(--radius-large);
  }
}

.room-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.room-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin: 4px 0;
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: var(--transition-all);
  position: relative;
  
  &:hover {
    background: var(--bg-light);
  }
  
  &.active {
    background: var(--primary-color);
    color: white;
    
    .room-name,
    .last-message {
      color: white;
    }
    
    .last-time {
      color: rgba(255, 255, 255, 0.8);
    }
  }
}

.room-avatar {
  position: relative;
  flex-shrink: 0;
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: var(--success-color);
  border: 2px solid var(--bg-white);
  border-radius: 50%;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.room-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.last-time {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.room-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-message {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.unread-badge {
  flex-shrink: 0;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-lighter);
}

.empty-chat {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-content {
  text-align: center;
  
  .empty-icon {
    font-size: 64px;
    color: var(--text-placeholder);
    margin-bottom: 16px;
  }
  
  h3 {
    color: var(--text-primary);
    margin-bottom: 8px;
  }
  
  p {
    color: var(--text-secondary);
    font-size: 14px;
  }
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>