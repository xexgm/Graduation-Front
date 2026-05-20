<template>
  <div class="profile-page">
    <div class="profile-card">
      <div class="profile-header">
        <el-button text @click="router.back()">返回</el-button>
        <h1>{{ isMe ? '我的资料' : '用户资料' }}</h1>
      </div>

      <div v-if="loading" class="profile-loading">
        <el-skeleton :rows="6" animated />
      </div>

      <template v-else-if="profile">
        <div class="profile-hero">
          <el-avatar :size="96" :src="displayAvatar">
            {{ (profile.nickname || profile.username || '?')[0] }}
          </el-avatar>
          <div class="profile-main">
            <div class="nickname">{{ profile.nickname || profile.username }}</div>
            <div class="username">@{{ profile.username }}</div>
            <el-tag v-if="profile.userNo" type="info">编号 {{ profile.userNo }}</el-tag>
          </div>
        </div>

        <el-descriptions :column="1" border class="profile-desc">
          <el-descriptions-item label="用户编号">{{ profile.userNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ profile.username }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ profile.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="个性签名">{{ profile.signature || '这个人很懒，什么都没写' }}</el-descriptions-item>
          <el-descriptions-item label="角色">{{ formatRole(profile.role) }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDateTime(profile.createTime) }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="isMe" class="edit-section">
          <h2>编辑资料</h2>
          <el-form :model="editForm" label-width="90px">
            <el-form-item label="头像">
              <div class="avatar-edit">
                <el-avatar :size="56" :src="displayAvatar">
                  {{ (editForm.nickname || profile.username || '?')[0] }}
                </el-avatar>
                <el-button :loading="uploadingAvatar" @click="avatarInputRef?.click()">上传头像</el-button>
                <input
                  ref="avatarInputRef"
                  type="file"
                  accept="image/*"
                  style="display: none"
                  @change="handleAvatarChange"
                />
              </div>
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="editForm.nickname" maxlength="64" show-word-limit />
            </el-form-item>
            <el-form-item label="个性签名">
              <el-input v-model="editForm.signature" type="textarea" :rows="3" maxlength="255" show-word-limit />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="saveProfile">保存资料</el-button>
            </el-form-item>
          </el-form>
        </div>
      </template>

      <el-empty v-else description="用户资料不存在" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fileApi, userProfileApi } from '@/api'
import { useUserStore } from '@/stores/user'
import type { UserProfile } from '@/types'
import { buildFileDownloadUrl, toApiAssetUrl } from '@/utils/url'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const profile = ref<UserProfile | null>(null)
const loading = ref(false)
const saving = ref(false)
const uploadingAvatar = ref(false)
const avatarInputRef = ref<HTMLInputElement>()

const editForm = reactive({
  nickname: '',
  signature: '',
  avatarUrl: ''
})

const isMe = computed(() => route.name === 'MyProfile')
const displayAvatar = computed(() => toApiAssetUrl(editForm.avatarUrl || profile.value?.avatarUrl))

const formatRole = (role?: number) => {
  if (role === 2) return '高级管理员'
  if (role === 1) return '管理员'
  return '普通用户'
}

const formatDateTime = (value?: string | number) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

const fillEditForm = (data: UserProfile) => {
  editForm.nickname = data.nickname || ''
  editForm.signature = data.signature || ''
  editForm.avatarUrl = data.avatarUrl || ''
}

const loadProfile = async () => {
  loading.value = true
  try {
    const response = isMe.value
      ? await userProfileApi.getMe()
      : await userProfileApi.getByUserNo(String(route.params.userNo || ''))
    profile.value = response.data || null
    if (profile.value && isMe.value) {
      fillEditForm(profile.value)
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '获取用户资料失败')
    profile.value = null
  } finally {
    loading.value = false
  }
}

const handleAvatarChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploadingAvatar.value = true
  try {
    const response = await fileApi.upload(file)
    if (response.code !== 200 || !response.data?.fileId) {
      throw new Error(response.message || '头像上传失败')
    }
    const avatarUrl = buildFileDownloadUrl(response.data.fileId)
    const profileResponse = await userProfileApi.update({
      nickname: editForm.nickname.trim(),
      signature: editForm.signature.trim(),
      avatarUrl
    })
    if (profileResponse.data) {
      profile.value = profileResponse.data
      fillEditForm(profileResponse.data)
      userStore.updateUser({
        userNo: profileResponse.data.userNo,
        nickname: profileResponse.data.nickname || userStore.user?.nickname,
        avatarUrl: profileResponse.data.avatarUrl || avatarUrl,
        signature: profileResponse.data.signature
      })
    }
    ElMessage.success('头像已更新')
  } catch (error: any) {
    ElMessage.error(error?.message || '头像上传失败')
  } finally {
    uploadingAvatar.value = false
    target.value = ''
  }
}

const saveProfile = async () => {
  if (!editForm.nickname.trim()) {
    ElMessage.warning('昵称不能为空')
    return
  }

  saving.value = true
  try {
    const response = await userProfileApi.update({
      nickname: editForm.nickname.trim(),
      signature: editForm.signature.trim(),
      avatarUrl: editForm.avatarUrl
    })
    if (response.data) {
      profile.value = response.data
      fillEditForm(response.data)
      userStore.updateUser({
        userNo: response.data.userNo,
        nickname: response.data.nickname || userStore.user?.nickname,
        avatarUrl: response.data.avatarUrl,
        signature: response.data.signature
      })
    }
    ElMessage.success('个人资料已更新')
  } catch (error: any) {
    ElMessage.error(error?.message || '保存资料失败')
  } finally {
    saving.value = false
  }
}

watch(() => route.fullPath, () => {
  loadProfile().catch(() => {})
})

onMounted(() => {
  loadProfile().catch(() => {})
})
</script>

<style scoped lang="scss">
.profile-page {
  min-height: 100vh;
  padding: 32px;
  overflow-y: auto;
  background: linear-gradient(135deg, var(--workspace-bg), var(--workspace-bg-soft));
}

.profile-card {
  max-width: 760px;
  margin: 0 auto;
  padding: 28px;
  border: 1px solid var(--workspace-border);
  border-radius: 24px;
  background: var(--workspace-panel);
  box-shadow: var(--workspace-shadow);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;

  h1 {
    margin: 0;
    color: var(--text-primary);
  }
}

.profile-hero {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
}

.nickname {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
}

.username {
  margin: 4px 0 10px;
  color: var(--text-secondary);
}

.profile-desc {
  margin-bottom: 24px;
}

.edit-section {
  padding-top: 20px;
  border-top: 1px solid var(--workspace-border);

  h2 {
    margin: 0 0 16px;
    color: var(--text-primary);
  }
}

.avatar-edit {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
