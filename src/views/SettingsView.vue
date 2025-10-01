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
            <el-avatar :size="80" :src="userStore.user?.avatar" class="user-avatar">
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
            
            <el-form-item label="邮箱">
              <el-input v-model="profileForm.email" placeholder="请输入邮箱" />
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, SwitchButton } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { useChatStore } from '@/stores/chat'
import { userApi } from '@/api'

const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()
const chatStore = useChatStore()

const avatarInputRef = ref<HTMLInputElement>()
const updating = ref(false)

const profileForm = reactive({
  username: userStore.user?.username || '',
  nickname: userStore.user?.nickname || '',
  email: userStore.user?.email || ''
})

const settings = reactive({
  notifications: true,
  soundEnabled: true,
  autoLogin: localStorage.getItem('remember') === 'true',
  showOnlineStatus: true,
  readReceipts: true
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
    const response = await userApi.updateAvatar(file)
    
    userStore.updateUser({ avatar: response.data.avatar })
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
    
    const response = await userApi.updateProfile({
      nickname: profileForm.nickname,
      email: profileForm.email
    })
    
    userStore.updateUser(response.data)
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
</style>