<template>
  <div class="settings-container">
    <div class="settings-header">
      <el-button type="text" :icon="ArrowLeft" @click="$router.back()" class="back-btn">
        返回
      </el-button>
      <h1>设置</h1>
    </div>

    <div class="settings-content">
      <div class="settings-section">
        <h2>个人信息</h2>
        <div class="profile-card">
          <div class="avatar-section">
            <el-avatar :size="80" :src="userStore.user?.avatarUrl" class="user-avatar">
              {{ userStore.user?.nickname?.[0] || userStore.user?.username?.[0] }}
            </el-avatar>
            <el-button type="primary" size="small" @click="handleAvatarUpload">
              更换头像
            </el-button>
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleAvatarChange"
            />
          </div>
          
          <el-form :model="profileForm" label-width="80px" class="profile-form">
            <el-form-item label="用户名">
              <el-input v-model="profileForm.username" disabled />
            </el-form-item>
            
            <el-form-item label="昵称">
              <el-input v-model="profileForm.nickname" placeholder="请输入昵称" />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="updateProfile" :loading="updating">
                保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <div class="settings-section">
        <h2>应用设置</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-title">主题模式</div>
              <div class="setting-desc">选择亮色或暗色主题</div>
            </div>
            <el-switch
              v-model="isDarkMode"
              @change="handleThemeChange"
              active-text="暗色"
              inactive-text="亮色"
            />
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-title">消息通知</div>
              <div class="setting-desc">接收新消息通知</div>
            </div>
            <el-switch v-model="settings.notifications" />
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-title">声音提醒</div>
              <div class="setting-desc">消息提醒音</div>
            </div>
            <el-switch v-model="settings.soundEnabled" />
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-title">自动登录</div>
              <div class="setting-desc">下次自动登录</div>
            </div>
            <el-switch v-model="settings.autoLogin" />
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>隐私设置</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-title">在线状态</div>
              <div class="setting-desc">显示在线状态</div>
            </div>
            <el-switch v-model="settings.showOnlineStatus" />
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-title">已读回执</div>
              <div class="setting-desc">发送已读回执</div>
            </div>
            <el-switch v-model="settings.readReceipts" />
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>账户</h2>
        <div class="settings-card">
          <el-button type="danger" plain @click="handleLogout" class="logout-btn">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-button>
        </div>
      </div>

      <!-- 管理员：聊天室管理 -->
      <div class="settings-section" v-if="isAdmin">
        <h2>聊天室管理（管理员）</h2>
        <div class="settings-card">
          <el-form :model="roomForm" label-width="100px" class="room-form">
            <el-form-item label="聊天室名称">
              <el-input v-model="roomForm.roomName" placeholder="请输入名称" />
            </el-form-item>
            <el-form-item label="聊天室类型">
              <el-select v-model="roomForm.roomType" placeholder="选择类型" style="width: 180px;">
                <el-option label="公开" value="PUBLIC_ROOM" />
                <el-option label="私有" value="PRIVATE_ROOM" />
              </el-select>
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="roomForm.description" placeholder="可选" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :disabled="!roomForm.roomName" @click="handleCreateRoom">
                创建聊天室
              </el-button>
            </el-form-item>
          </el-form>

          <div class="admin-room-list">
            <div class="admin-room-item" v-for="room in chatStore.rooms" :key="room.id">
              <div class="admin-room-info">
                <div class="room-name">{{ room.name || '未命名聊天室' }}</div>
                <div class="room-meta">ID: {{ room.id }}</div>
              </div>
              <div class="admin-room-actions">
                <el-button size="small" @click="handleOffline(room)">下线</el-button>
                <el-button size="small" type="danger" @click="handleDelete(room)">删除</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, SwitchButton } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { useChatStore } from '@/stores/chat'
// import { userApi } from '@/api' // 暂时移除，等待后端实现

const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()
const chatStore = useChatStore()

const avatarInputRef = ref<HTMLInputElement>()
const updating = ref(false)

const profileForm = reactive({
  username: userStore.user?.username || '',
  nickname: userStore.user?.nickname || '',
  // email: userStore.user?.email || '' // 移除不存在的 email 属性
})

const settings = reactive({
  notifications: true,
  soundEnabled: true,
  autoLogin: localStorage.getItem('remember') === 'true',
  showOnlineStatus: true,
  readReceipts: true
})

// 管理员判定：role === 1
const isAdmin = computed(() => userStore.user?.role === 1)

// 聊天室表单
const roomForm = reactive<{ roomName: string; description?: string; roomType: 'PUBLIC_ROOM' | 'PRIVATE_ROOM' }>({
  roomName: '',
  description: '',
  roomType: 'PUBLIC_ROOM'
})

const isDarkMode = computed({
  get: () => themeStore.theme === 'dark',
  set: (value: boolean) => {
    themeStore.setTheme(value ? 'dark' : 'light')
  }
})

const handleThemeChange = (value: boolean) => {
  themeStore.setTheme(value ? 'dark' : 'light')
}

const handleAvatarUpload = () => {
  avatarInputRef.value?.click()
}

const handleAvatarChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    ElMessage.info('头像上传中...')
    // 暂时移除文件上传功能，等待后端实现
    const avatarUrl = URL.createObjectURL(file)
    
    userStore.updateUser({ avatarUrl })
    ElMessage.success('头像更新成功')
  } catch (error: any) {
    ElMessage.error('头像上传失败')
  } finally {
    target.value = ''
  }
}

const updateProfile = async () => {
  try {
    updating.value = true
    
    // 暂时移除 API 调用，等待后端实现
    userStore.updateUser({
      nickname: profileForm.nickname
    })
    ElMessage.success('个人信息更新成功')
  } catch (error: any) {
    ElMessage.error('更新失败，请重试')
  } finally {
    updating.value = false
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await userStore.logout()
    chatStore.disconnect()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {
    // 用户取消操作
  }
}

const handleCreateRoom = async () => {
  try {
    const created = await chatStore.createRoom(roomForm.roomName, roomForm.description, roomForm.roomType)
    ElMessage.success(`已创建：${created.name}`)
    roomForm.roomName = ''
    roomForm.description = ''
    roomForm.roomType = 'PUBLIC_ROOM'
  } catch (e: any) {
    ElMessage.error(e.message || '创建失败')
  }
}

const handleOffline = async (room: { id: string }) => {
  try {
    await chatStore.offlineRoom(parseInt(room.id))
    ElMessage.success('已下线')
  } catch (e: any) {
    ElMessage.error(e.message || '下线失败')
  }
}

const handleDelete = async (room: { id: string }) => {
  try {
    await ElMessageBox.confirm('确认删除该聊天室？操作不可恢复', '提示', { type: 'warning' })
    await chatStore.deleteRoom(parseInt(room.id))
    ElMessage.success('已删除')
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

onMounted(async () => {
  if (!chatStore.rooms.length) {
    try { await chatStore.fetchRooms() } catch {}
  }
})
</script>

<style scoped lang="scss">
.settings-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: var(--bg-lighter);
  min-height: 100vh;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  
  .back-btn {
    font-size: 18px;
    color: var(--text-secondary);
    
    &:hover {
      color: var(--primary-color);
    }
  }
  
  h1 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section {
  h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
  }
}

.profile-card,
.settings-card {
  background: var(--bg-white);
  border-radius: var(--radius-large);
  padding: 24px;
  box-shadow: var(--shadow-light);
  border: 1px solid var(--border-light);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  
  .user-avatar {
    border: 4px solid var(--border-light);
  }
}

.profile-form {
  max-width: 400px;
  margin: 0 auto;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-light);
  
  &:last-child {
    border-bottom: none;
  }
}

.setting-info {
  .setting-title {
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
  }
  
  .setting-desc {
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.logout-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  border-color: var(--danger-color);
  color: var(--danger-color);
  
  &:hover {
    background: var(--danger-color);
    color: white;
  }
  
  .el-icon {
    margin-right: 8px;
  }
}

:deep(.el-switch) {
  --el-switch-on-color: var(--primary-color);
}

:deep(.el-form-item__label) {
  color: var(--text-primary);
  font-weight: 500;
}

:deep(.el-input__inner) {
  border-radius: var(--radius-base);
}

:deep(.el-button) {
  border-radius: var(--radius-base);
}

.room-form {
  max-width: 520px;
}

.admin-room-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.admin-room-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-base);
}

.admin-room-info {
  display: flex;
  flex-direction: column;
}

.admin-room-info .room-name {
  font-weight: 600;
  color: var(--text-primary);
}

.admin-room-info .room-meta {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
