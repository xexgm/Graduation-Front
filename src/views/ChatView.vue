<template>
  <div class="chat-container">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="user-info">
          <el-avatar :size="40" :src="userStore.user?.avatarUrl">
            {{ userStore.user?.nickname?.[0] || userStore.user?.username?.[0] }}
          </el-avatar>
          <div class="user-details">
            <div class="username">{{ userStore.user?.nickname || userStore.user?.username }}</div>
            <div class="status">在线</div>
          </div>
        </div>
        <div class="sidebar-actions">
          <el-button
            v-if="isAdmin"
            type="text"
            :icon="Plus"
            @click="showCreateDialog = true"
            class="create-room-btn"
            title="创建聊天室"
          />
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
                v-if="room.type === 'private' && isUserOnline(room.participants[0]?.userId.toString())"
                class="online-indicator"
              />
            </div>
            <div class="room-info">
              <div class="room-header">
                <span class="room-name">{{ getRoomName(room) }}</span>
                <span class="last-time">{{ formatTime(room.lastMessage?.timestamp) }}</span>
                <span v-if="isAdmin" class="admin-actions" @click.stop>
                  <el-dropdown trigger="click" @command="(cmd:any) => handleAdminAction(cmd, room)">
                    <span class="el-dropdown-link" @click.stop>
                      <el-icon><MoreFilled /></el-icon>
                    </span>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="offline">下线</el-dropdown-item>
                        <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </span>
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
  
  <!-- 创建聊天室对话框 -->
  <el-dialog v-model="showCreateDialog" title="创建聊天室" width="420px">
    <el-form :model="createForm" label-width="100px">
      <el-form-item label="聊天室名称">
        <el-input v-model="createForm.roomName" placeholder="请输入名称" />
      </el-form-item>
      <el-form-item label="聊天室类型">
        <el-select v-model="createForm.roomType" placeholder="选择类型" style="width: 180px;">
          <el-option label="公开" value="PUBLIC_ROOM" />
          <el-option label="私有" value="PRIVATE_ROOM" />
        </el-select>
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="createForm.description" placeholder="可选" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showCreateDialog = false">取消</el-button>
      <el-button type="primary" :disabled="!createForm.roomName" @click="handleCreateRoom">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, 
  Setting, 
  Moon, 
  ChatDotRound,
  Plus,
  MoreFilled
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
const isAdmin = computed(() => userStore.user?.role === 1)

// 创建聊天室对话框
const showCreateDialog = ref(false)
const createForm = reactive<{ roomName: string; roomType: 'PUBLIC_ROOM' | 'PRIVATE_ROOM'; description?: string}>(
  { roomName: '', roomType: 'PUBLIC_ROOM', description: '' }
)

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
    const otherUser = room.participants.find(p => p.userId !== userStore.user?.userId)
    return otherUser?.nickname || otherUser?.username || '未知用户'
  }
  return '群聊'
}

const isUserOnline = (_userId: string) => false

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
    chatStore.setCurrentRoom(room.id)
    await chatStore.fetchMessages(room.id)
  } catch (error) {
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

const handleCreateRoom = async () => {
  if (!createForm.roomName) return
  try {
    const room = await chatStore.createRoom(createForm.roomName, createForm.description, createForm.roomType)
    ElMessage.success('创建成功')
    // 可选：自动选中新建房间
    chatStore.setCurrentRoom(room.id)
    showCreateDialog.value = false
    createForm.roomName = ''
    createForm.description = ''
    createForm.roomType = 'PUBLIC_ROOM'
  } catch (e: any) {
    ElMessage.error(e.message || '创建失败')
  }
}

const handleAdminAction = async (cmd: string, room: any) => {
  if (cmd === 'offline') {
    try {
      await chatStore.offlineRoom(parseInt(room.id))
      ElMessage.success('已下线')
    } catch (e: any) {
      ElMessage.error(e.message || '下线失败')
    }
  } else if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm('确认删除该聊天室？操作不可恢复', '提示', { type: 'warning' })
      await chatStore.deleteRoom(parseInt(room.id))
      ElMessage.success('已删除')
    } catch (e: any) {
      if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
    }
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
  gap: 8px;
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

.admin-actions {
  display: flex;
  align-items: center;
  color: var(--text-secondary);
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
