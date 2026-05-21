<template>
  <div class="module-pane">
    <div class="pane-header">
      <div class="title">聊天室</div>
      <el-button v-if="isAdmin" size="small" type="primary" @click="showCreateDialog = true">创建聊天室</el-button>
      <el-button v-else size="small" @click="goSettings">申请管理员</el-button>
    </div>

    <el-scrollbar class="list-wrap">
      <div
        v-for="room in chatStore.rooms"
        :key="room.id"
        class="room-item"
      >
        <div class="room-main" @click="openRoom(room.id)">
          <el-avatar :size="40" :src="room.avatar">
            {{ (room.name || '聊')[0] }}
          </el-avatar>
          <div class="meta">
            <div class="name">{{ room.name || `聊天室 ${room.id}` }}</div>
            <div class="sub">ID: {{ room.id }}</div>
          </div>
          <el-badge v-if="room.unreadCount > 0" :value="room.unreadCount" :max="99" />
        </div>
        <el-button size="small" type="primary" @click="openRoom(room.id)">进入</el-button>
      </div>

      <div v-if="chatStore.rooms.length === 0" class="empty-state">
        <el-empty description="暂无公开聊天室" :image-size="80" />
      </div>
    </el-scrollbar>

    <el-dialog v-model="showCreateDialog" title="创建聊天室" width="420px">
      <el-form :model="createForm" label-width="90px" @submit.prevent="handleCreateRoom">
        <el-form-item label="名称">
          <el-input v-model="createForm.roomName" placeholder="请输入聊天室名称" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="createForm.roomType" style="width: 100%">
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
        <el-button type="primary" :loading="creating" @click="handleCreateRoom">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useConversationStore } from '@/stores/conversation'
import { useUserStore } from '@/stores/user'

const chatStore = useChatStore()
const conversationStore = useConversationStore()
const userStore = useUserStore()
const router = useRouter()

const showCreateDialog = ref(false)
const creating = ref(false)
const isAdmin = computed(() => [1, 2].includes(Number(userStore.user?.role)))
const createForm = reactive<{
  roomName: string
  roomType: 'PUBLIC_ROOM' | 'PRIVATE_ROOM'
  description?: string
}>({
  roomName: '',
  roomType: 'PUBLIC_ROOM',
  description: ''
})

const openRoom = async (roomId: string) => {
  await conversationStore.openRoomByRoomId(Number(roomId))
}

const goSettings = () => {
  ElMessage.info('请先申请成为管理员后再创建聊天室')
  router.push('/settings')
}

const handleCreateRoom = async () => {
  const roomName = createForm.roomName.trim()
  if (!isAdmin.value) {
    goSettings()
    return
  }
  if (!roomName) {
    ElMessage.warning('请输入聊天室名称')
    return
  }

  creating.value = true
  try {
    const room = await chatStore.createRoom(roomName, createForm.description, createForm.roomType)
    await chatStore.fetchRooms()
    await conversationStore.openRoomByRoomId(Number(room.id))
    showCreateDialog.value = false
    createForm.roomName = ''
    createForm.roomType = 'PUBLIC_ROOM'
    createForm.description = ''
    ElMessage.success('聊天室创建成功')
  } catch (error: any) {
    ElMessage.error(error?.message || '创建聊天室失败')
  } finally {
    creating.value = false
  }
}
</script>

<style scoped lang="scss">
.module-pane {
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

.list-wrap {
  flex: 1;
  padding: 10px;
}

.room-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  margin-bottom: 8px;
  transition: var(--transition-all);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, var(--workspace-glow), transparent 55%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .room-main,
  .el-button {
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
}

.room-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.meta {
  flex: 1;
  min-width: 0;
}

.name {
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-state {
  padding-top: 30px;
}

@media (prefers-reduced-motion: reduce) {
  .room-item,
  .room-item::before,
  .room-item .el-avatar {
    transition: none;
  }

  .room-item:hover,
  .room-item:hover .el-avatar {
    transform: none;
  }
}
</style>

