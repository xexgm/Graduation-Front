<template>
  <div class="lobby-container">
    <div class="lobby-header">
      <h1>聊天室大厅</h1>
      <div class="actions">
        <el-button type="primary" @click="refreshRooms" :loading="loading">刷新</el-button>
        <el-button @click="$router.push('/chat')">进入聊天页</el-button>
      </div>
    </div>

    <div class="room-list">
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
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
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
})
</script>

<style scoped lang="scss">
.lobby-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
}

.lobby-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-white);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-base);
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

