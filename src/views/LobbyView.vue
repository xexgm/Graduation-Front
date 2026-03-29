<template>
  <div class="lobby-container">
    <div class="lobby-header">
      <h1>聊天室大厅</h1>
      <div class="actions">
        <el-button type="primary" @click="refreshRooms" :loading="loading">刷新</el-button>
        <el-button @click="$router.push('/chat')">进入聊天页</el-button>
      </div>
    </div>

    <div class="layout-body">
      <!-- 左侧好友列表 -->
      <div class="sidebar-friends">
        <FriendList />
      </div>

      <!-- 右侧房间列表和私聊窗口 -->
      <div class="main-content">
        <!-- 如果选中了好友，显示私聊窗口 -->
        <div v-if="friendStore.activeFriendId !== null" class="private-chat-wrapper">
          <PrivateChatWindow />
        </div>

        <!-- 否则显示大厅群聊列表 -->
        <div v-else class="room-list">
          <div class="room-card" v-for="room in chatStore.rooms" :key="room.id">
            <div class="room-info">
              <el-avatar :size="40" :src="room.avatar">{{ (room.name || '聊天室')[0] }}</el-avatar>
              <div class="meta">
                <div class="name">{{ room.name || '未命名聊天室' }}</div>
                <div class="sub">ID: {{ room.id }}</div>
              </div>
            </div>
            <div class="room-actions">
              <template v-if="String(chatStore.currentRoomId) === String(room.id)">
                <el-tag type="success" effect="plain">已加入</el-tag>
                <el-button size="small" type="primary" @click="$router.push('/chat')">进入</el-button>
                <el-button size="small" @click="leaveRoom">退出</el-button>
              </template>
              <template v-else>
                <el-button size="small" type="primary" @click="joinRoom(room.id)">加入</el-button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '@/stores/chat'
import { useFriendStore } from '@/stores/friend'
import FriendList from '@/components/friend/FriendList.vue'
import PrivateChatWindow from '@/components/friend/PrivateChatWindow.vue'

const chatStore = useChatStore()
const friendStore = useFriendStore()
const loading = ref(false)

const refreshRooms = async () => {
  try {
    loading.value = true
    await chatStore.fetchRooms()
  } catch (e) {
    ElMessage.error('刷新失败')
  } finally {
    loading.value = false
  }
}

const joinRoom = async (roomId: string) => {
  try {
    chatStore.setCurrentRoom(roomId)
    ElMessage.success('已加入聊天室')
  } catch (e) {
    ElMessage.error('加入失败')
  }
}

const leaveRoom = async () => {
  try {
    chatStore.leaveCurrentRoom()
    ElMessage.success('已退出聊天室')
  } catch (e) {
    ElMessage.error('退出失败')
  }
}

onMounted(async () => {
  if (!chatStore.rooms.length) {
    await refreshRooms()
  }

  // 确保 WebSocket 已连接，私聊消息才能正常发送/接收
  try {
    await chatStore.initWebSocket()
  } catch (e) {
    console.error('Failed to initialize WebSocket in Lobby:', e)
  }

  // 初始化好友 WebSocket 和好友列表
  friendStore.initFriendWebSocket()
  await friendStore.fetchFriends()
  friendStore.startFriendPolling(5000)
})

onUnmounted(() => {
  friendStore.stopFriendPolling()
})
</script>

<style scoped lang="scss">
.lobby-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.lobby-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.layout-body {
  display: flex;
  flex: 1;
  gap: 20px;
  overflow: hidden;
  background: var(--bg-white);
  border-radius: var(--radius-large);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.sidebar-friends {
  width: 280px;
  border-right: 1px solid var(--border-light);
  background: #fdfdfd;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.private-chat-wrapper {
  height: 100%;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
}

.room-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-white);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-base);
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
}

.room-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta .name {
  font-weight: 600;
  color: var(--text-primary);
}

.meta .sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.room-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

