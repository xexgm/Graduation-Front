<template>
  <div class="admin-dashboard">
    <div class="admin-header">
      <div>
        <h1>管理员后台</h1>
        <p>用户、聊天室、系统通知与管理员申请管理</p>
      </div>
      <el-button @click="router.push('/workspace')">返回工作台</el-button>
    </div>

    <el-tabs v-model="activeTab" class="admin-tabs">
      <el-tab-pane label="用户管理" name="users">
        <div class="toolbar">
          <el-input v-model="userQuery.keyword" clearable placeholder="搜索用户名/昵称" @keyup.enter="fetchUsers" />
          <el-select v-model="userQuery.role" clearable placeholder="角色">
            <el-option label="普通用户" :value="0" />
            <el-option label="管理员" :value="1" />
            <el-option label="高级管理员" :value="2" />
          </el-select>
          <el-select v-model="userQuery.status" clearable placeholder="状态">
            <el-option label="正常" :value="1" />
            <el-option label="已封禁" :value="0" />
          </el-select>
          <el-button type="primary" :loading="loading.users" @click="fetchUsers">查询</el-button>
        </div>

        <el-table :data="users" border>
          <el-table-column prop="userId" label="ID" width="90" />
          <el-table-column prop="username" label="用户名" min-width="130" />
          <el-table-column prop="nickname" label="昵称" min-width="130" />
          <el-table-column label="角色" width="110">
            <template #default="{ row }">{{ formatRole(row.role) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ formatUserStatus(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="注册时间" min-width="160">
            <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status === 1" size="small" type="danger" @click="banUser(row)">封禁</el-button>
              <el-button v-else size="small" type="success" @click="unbanUser(row)">解封</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="聊天室管理" name="rooms">
        <div class="toolbar">
          <el-input v-model="roomQuery.keyword" clearable placeholder="搜索聊天室" @keyup.enter="fetchRooms" />
          <el-select v-model="roomQuery.status" clearable placeholder="状态">
            <el-option label="正常" :value="0" />
            <el-option label="已封禁" :value="1" />
            <el-option label="已解散" :value="2" />
          </el-select>
          <el-button type="primary" :loading="loading.rooms" @click="fetchRooms">查询</el-button>
        </div>

        <el-table :data="rooms" border>
          <el-table-column prop="roomId" label="ID" width="90" />
          <el-table-column prop="roomName" label="聊天室" min-width="150" />
          <el-table-column prop="ownerId" label="创建者ID" width="110" />
          <el-table-column label="类型" width="110">
            <template #default="{ row }">{{ row.roomType === 'PRIVATE_ROOM' ? '私有' : '公开' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getRoomStatusTag(row.status)">{{ formatRoomStatus(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="onlineCount" label="在线人数" width="100" />
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <el-button v-if="isRoomActive(row.status)" size="small" @click="banRoom(row)">封禁</el-button>
              <el-button v-else-if="isRoomBanned(row.status)" size="small" type="success" @click="restoreRoom(row)">恢复</el-button>
              <el-button size="small" type="danger" @click="deleteRoom(row)">解散</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="系统通知" name="notices">
        <el-card class="notice-form-card" shadow="never">
          <el-form :model="noticeForm" label-width="90px">
            <el-form-item label="通知标题">
              <el-input v-model="noticeForm.title" maxlength="128" show-word-limit placeholder="请输入通知标题" />
            </el-form-item>
            <el-form-item label="通知目标">
              <el-select v-model="noticeForm.targetType">
                <el-option label="所有普通用户" :value="1" />
                <el-option label="所有聊天室" :value="2" />
              </el-select>
            </el-form-item>
            <el-form-item label="通知内容">
              <el-input v-model="noticeForm.content" type="textarea" :rows="4" placeholder="请输入通知内容" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loading.publishNotice" @click="publishNotice">发布通知</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <div class="toolbar">
          <el-select v-model="noticeQuery.targetType" clearable placeholder="目标">
            <el-option label="所有普通用户" :value="1" />
            <el-option label="所有聊天室" :value="2" />
          </el-select>
          <el-select v-model="noticeQuery.status" clearable placeholder="状态">
            <el-option label="已发布" :value="1" />
            <el-option label="已撤回" :value="0" />
          </el-select>
          <el-button type="primary" :loading="loading.notices" @click="fetchNotices">刷新</el-button>
        </div>

        <el-table :data="notices" border>
          <el-table-column prop="noticeId" label="ID" width="90" />
          <el-table-column prop="title" label="标题" min-width="160" />
          <el-table-column prop="content" label="内容" min-width="260" show-overflow-tooltip />
          <el-table-column label="目标" width="130">
            <template #default="{ row }">{{ formatNoticeTarget(row.targetType) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="isNoticePublished(row.status) ? 'success' : 'info'">{{ isNoticePublished(row.status) ? '已发布' : '已撤回' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="发布时间" min-width="160">
            <template #default="{ row }">{{ formatDateTime(row.publishTime || row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button v-if="isNoticePublished(row.status)" size="small" type="warning" @click="revokeNotice(row)">撤回</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane v-if="isSuperAdmin" label="管理员申请" name="applications">
        <div class="toolbar">
          <el-select v-model="applicationQuery.status" clearable placeholder="状态">
            <el-option label="待审核" :value="0" />
            <el-option label="已通过" :value="1" />
            <el-option label="已拒绝" :value="2" />
            <el-option label="已取消" :value="3" />
          </el-select>
          <el-button type="primary" :loading="loading.applications" @click="fetchApplications">查询</el-button>
        </div>

        <el-table :data="applications" border>
          <el-table-column prop="id" label="ID" width="90" />
          <el-table-column prop="userId" label="用户ID" width="100" />
          <el-table-column label="申请人" min-width="150">
            <template #default="{ row }">{{ row.nickname || row.username || `用户${row.userId}` }}</template>
          </el-table-column>
          <el-table-column prop="reason" label="申请理由" min-width="260" show-overflow-tooltip />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getApplicationStatusTag(row.status)">{{ formatApplicationStatus(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="申请时间" min-width="160">
            <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <template v-if="isApplicationPending(row.status)">
                <el-button size="small" type="primary" @click="reviewApplication(row, true)">通过</el-button>
                <el-button size="small" @click="reviewApplication(row, false)">拒绝</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApplicationApi, adminChatRoomApi, adminNoticeApi, adminUserApi } from '@/api'
import { useUserStore } from '@/stores/user'
import type {
  AdminApplication,
  AdminApplicationQuery,
  AdminChatRoom,
  AdminChatRoomQuery,
  AdminNotice,
  AdminNoticeCreateRequest,
  AdminNoticeQuery,
  AdminUser,
  AdminUserQuery,
  ChatRoomStatus,
  PageResult,
  UserRole,
  UserStatus
} from '@/types'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref('users')

const isSuperAdmin = computed(() => userStore.user?.role === 2)

const users = ref<AdminUser[]>([])
const rooms = ref<AdminChatRoom[]>([])
const notices = ref<AdminNotice[]>([])
const applications = ref<AdminApplication[]>([])

const userQuery = reactive<AdminUserQuery>({ current: 1, size: 20, keyword: '', role: '', status: '' })
const roomQuery = reactive<AdminChatRoomQuery>({ current: 1, size: 20, keyword: '', status: '' })
const noticeQuery = reactive<AdminNoticeQuery>({ current: 1, size: 20, targetType: '', status: '' })
const applicationQuery = reactive<AdminApplicationQuery>({ current: 1, size: 20, status: 0 })
const noticeForm = reactive<AdminNoticeCreateRequest>({ title: '', content: '', targetType: 1 })

const loading = reactive({
  users: false,
  rooms: false,
  notices: false,
  publishNotice: false,
  applications: false
})

function unwrapRecords<T>(data: PageResult<T> | T[] | null | undefined): T[] {
  if (!data) return []
  return Array.isArray(data) ? data : data.records || []
}

const formatRole = (role: UserRole) => {
  if (role === 2) return '高级管理员'
  if (role === 1) return '管理员'
  return '普通用户'
}

const formatUserStatus = (status: UserStatus) => status === 1 ? '正常' : '已封禁'

const formatDateTime = (value?: string | number) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

const formatRoomStatus = (status: AdminChatRoom['status']) => {
  if (status === 'ACTIVE' || status === 0) return '正常'
  if (status === 'DISBANDED' || status === 1) return '已封禁'
  if (status === 'DELETED' || status === 2) return '已解散'
  return String(status)
}

const isRoomActive = (status: AdminChatRoom['status']) => status === 'ACTIVE' || status === 0
const isRoomBanned = (status: AdminChatRoom['status']) => status === 'DISBANDED' || status === 1
const getRoomStatusTag = (status: AdminChatRoom['status']) => {
  if (isRoomActive(status)) return 'success'
  if (isRoomBanned(status)) return 'warning'
  return 'info'
}

const formatApplicationStatus = (status: AdminApplication['status']) => {
  if (status === 'PENDING' || status === 0) return '待审核'
  if (status === 'APPROVED' || status === 1) return '已通过'
  if (status === 'REJECTED' || status === 2) return '已拒绝'
  if (status === 'CANCELED' || status === 3) return '已取消'
  return String(status)
}

const isApplicationPending = (status: AdminApplication['status']) => status === 'PENDING' || status === 0
const getApplicationStatusTag = (status: AdminApplication['status']) => {
  if (status === 'APPROVED' || status === 1) return 'success'
  if (status === 'REJECTED' || status === 2) return 'danger'
  if (status === 'CANCELED' || status === 3) return 'info'
  return 'warning'
}

const formatNoticeTarget = (targetType: AdminNotice['targetType']) => {
  return targetType === 2 || targetType === 'ALL_CHATROOMS' ? '所有聊天室' : '所有普通用户'
}

const isNoticePublished = (status: AdminNotice['status']) => status === 1 || status === 'PUBLISHED'

const fetchUsers = async () => {
  loading.users = true
  try {
    const response = await adminUserApi.list(userQuery)
    users.value = unwrapRecords(response.data)
  } finally {
    loading.users = false
  }
}

const banUser = async (user: AdminUser) => {
  const { value } = await ElMessageBox.prompt('请输入封禁原因', `封禁用户 ${user.username}`, {
    confirmButtonText: '封禁',
    cancelButtonText: '取消',
    inputPlaceholder: '发布违规内容'
  })
  await adminUserApi.ban(user.userId, { reason: value })
  ElMessage.success('用户已封禁')
  await fetchUsers()
}

const unbanUser = async (user: AdminUser) => {
  await adminUserApi.unban(user.userId)
  ElMessage.success('用户已解封')
  await fetchUsers()
}

const fetchRooms = async () => {
  loading.rooms = true
  try {
    const response = await adminChatRoomApi.list(roomQuery)
    rooms.value = unwrapRecords(response.data)
  } finally {
    loading.rooms = false
  }
}

const banRoom = async (room: AdminChatRoom) => {
  const { value } = await ElMessageBox.prompt('请输入封禁原因', `封禁聊天室 ${room.roomName}`, {
    confirmButtonText: '封禁',
    cancelButtonText: '取消',
    inputPlaceholder: '聊天室违规'
  })
  await adminChatRoomApi.ban(room.roomId, { reason: value })
  ElMessage.success('聊天室已封禁')
  await fetchRooms()
}

const restoreRoom = async (room: AdminChatRoom) => {
  await adminChatRoomApi.restore(room.roomId)
  ElMessage.success('聊天室已恢复')
  await fetchRooms()
}

const deleteRoom = async (room: AdminChatRoom) => {
  await ElMessageBox.confirm(`确认解散聊天室「${room.roomName}」？`, '提示', { type: 'warning' })
  await adminChatRoomApi.delete(room.roomId)
  ElMessage.success('聊天室已解散')
  await fetchRooms()
}

const fetchNotices = async () => {
  loading.notices = true
  try {
    const response = await adminNoticeApi.list(noticeQuery)
    notices.value = unwrapRecords(response.data)
  } finally {
    loading.notices = false
  }
}

const publishNotice = async () => {
  if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
    ElMessage.warning('请填写通知标题和内容')
    return
  }
  loading.publishNotice = true
  try {
    await adminNoticeApi.create({
      title: noticeForm.title.trim(),
      content: noticeForm.content.trim(),
      targetType: noticeForm.targetType
    })
    ElMessage.success('通知已发布')
    noticeForm.title = ''
    noticeForm.content = ''
    await fetchNotices()
  } finally {
    loading.publishNotice = false
  }
}

const revokeNotice = async (notice: AdminNotice) => {
  await ElMessageBox.confirm(`确认撤回通知「${notice.title}」？`, '提示', { type: 'warning' })
  await adminNoticeApi.revoke(notice.noticeId)
  ElMessage.success('通知已撤回')
  await fetchNotices()
}

const fetchApplications = async () => {
  if (!isSuperAdmin.value) return
  loading.applications = true
  try {
    const response = await adminApplicationApi.list(applicationQuery)
    applications.value = unwrapRecords(response.data)
  } finally {
    loading.applications = false
  }
}

const reviewApplication = async (application: AdminApplication, approved: boolean) => {
  const { value } = await ElMessageBox.prompt('请输入审批意见（可选）', approved ? '通过申请' : '拒绝申请', {
    confirmButtonText: approved ? '通过' : '拒绝',
    cancelButtonText: '取消'
  })
  if (approved) {
    await adminApplicationApi.approve(application.id, { reviewComment: value })
    ElMessage.success('已通过申请')
  } else {
    await adminApplicationApi.reject(application.id, { reviewComment: value })
    ElMessage.success('已拒绝申请')
  }
  await fetchApplications()
}

watch(activeTab, (tab) => {
  if (tab === 'users') fetchUsers().catch(() => {})
  if (tab === 'rooms') fetchRooms().catch(() => {})
  if (tab === 'notices') fetchNotices().catch(() => {})
  if (tab === 'applications') fetchApplications().catch(() => {})
})

onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchRooms(),
    fetchNotices()
  ])
  if (isSuperAdmin.value) {
    await fetchApplications()
  }
})
</script>

<style scoped lang="scss">
.admin-dashboard {
  min-height: 100vh;
  padding: 24px;
  background: var(--bg-lighter);
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;

  h1 {
    margin: 0 0 4px;
    color: var(--text-primary);
  }

  p {
    margin: 0;
    color: var(--text-secondary);
  }
}

.admin-tabs {
  padding: 20px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-large);
  background: var(--bg-white);
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;

  .el-input,
  .el-select {
    max-width: 220px;
  }
}

.notice-form-card {
  margin-bottom: 16px;
}
</style>
