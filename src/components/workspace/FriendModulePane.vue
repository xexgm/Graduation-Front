<template>
  <div class="module-pane">
    <div class="pane-header">
      <div class="title">好友</div>
      <el-button size="small" type="primary" @click="showAddDialog = true">添加好友</el-button>
    </div>

    <el-scrollbar class="list-wrap">
      <div class="request-card">
        <div class="request-header">
          <span>好友请求</span>
          <el-button size="small" text @click="refreshRequests">刷新</el-button>
        </div>
        <el-tabs v-model="activeRequestTab" class="request-tabs">
          <el-tab-pane :label="`收到(${friendStore.receivedRequests.length})`" name="received">
            <div v-if="friendStore.receivedRequests.length === 0" class="request-empty">暂无待处理请求</div>
            <div
              v-for="request in friendStore.receivedRequests"
              :key="request.id"
              class="request-item"
            >
              <el-avatar :size="32" :src="request.senderAvatarUrl">
                {{ (request.senderNickname || request.senderUsername || '?')[0] }}
              </el-avatar>
              <div class="request-meta">
                <div class="request-name">{{ request.senderNickname || request.senderUsername || `用户${request.senderId}` }}</div>
                <div class="request-message">{{ request.message || '请求添加你为好友' }}</div>
                <div class="request-time">{{ formatTime(request.createTime) }}</div>
              </div>
              <div class="request-actions">
                <el-button size="small" type="primary" @click="acceptRequest(request.id)">同意</el-button>
                <el-button size="small" @click="rejectRequest(request.id)">拒绝</el-button>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane :label="`发出(${friendStore.sentRequests.length})`" name="sent">
            <div v-if="friendStore.sentRequests.length === 0" class="request-empty">暂无发出的请求</div>
            <div
              v-for="request in friendStore.sentRequests"
              :key="request.id"
              class="request-item"
            >
              <el-avatar :size="32" :src="request.receiverAvatarUrl">
                {{ (request.receiverNickname || request.receiverUsername || '?')[0] }}
              </el-avatar>
              <div class="request-meta">
                <div class="request-name">{{ request.receiverNickname || request.receiverUsername || `用户${request.receiverId}` }}</div>
                <div class="request-message">{{ formatRequestStatus(request.status) }}</div>
                <div class="request-time">{{ formatTime(request.createTime) }}</div>
              </div>
              <el-button
                v-if="isPending(request.status)"
                size="small"
                @click="cancelRequest(request.id)"
              >
                取消
              </el-button>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div
        v-for="friend in friendStore.friends"
        :key="friend.userId"
        class="friend-item"
        @click="openPrivate(friend.userId)"
      >
        <el-avatar :size="40" :src="friend.avatarUrl">
          {{ (friend.nickname || friend.username || '?')[0] }}
        </el-avatar>
        <div class="meta">
          <div class="name">{{ friend.nickname || friend.username }}</div>
          <div class="sub">{{ friend.signature || '这个人很懒，什么都没写' }}</div>
        </div>
      </div>

      <div v-if="friendStore.friends.length === 0" class="empty-state">
        <el-empty description="暂无好友" :image-size="80" />
      </div>
    </el-scrollbar>

    <el-dialog v-model="showAddDialog" title="添加好友" width="360px">
      <el-form @submit.prevent="handleAddFriend">
        <el-form-item label="好友ID">
          <el-input v-model.number="friendIdInput" type="number" placeholder="请输入好友用户ID" />
        </el-form-item>
        <el-form-item label="附言">
          <el-input
            v-model="friendRequestMessage"
            type="textarea"
            :rows="3"
            maxlength="255"
            show-word-limit
            placeholder="介绍一下自己"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" :loading="adding" @click="handleAddFriend">发送请求</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, ref } from 'vue'
import { useConversationStore } from '@/stores/conversation'
import { useFriendStore } from '@/stores/friend'
import type { FriendRequestStatus } from '@/types'

const friendStore = useFriendStore()
const conversationStore = useConversationStore()

const showAddDialog = ref(false)
const adding = ref(false)
const friendIdInput = ref<number | null>(null)
const friendRequestMessage = ref('')
const activeRequestTab = ref<'received' | 'sent'>('received')

const openPrivate = async (friendId: number) => {
  await conversationStore.openPrivateByFriendId(friendId)
}

const handleAddFriend = async () => {
  const friendId = Number(friendIdInput.value)
  if (!Number.isFinite(friendId) || friendId <= 0) {
    ElMessage.warning('请输入有效的好友ID')
    return
  }

  adding.value = true
  try {
    const ok = await friendStore.sendFriendRequest(friendId, friendRequestMessage.value.trim() || undefined)
    if (ok) {
      ElMessage.success('好友请求已发送')
      friendIdInput.value = null
      friendRequestMessage.value = ''
      showAddDialog.value = false
      await friendStore.fetchSentRequests()
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '发送好友请求失败')
  } finally {
    adding.value = false
  }
}

const refreshRequests = async () => {
  await Promise.all([
    friendStore.fetchReceivedRequests(),
    friendStore.fetchSentRequests()
  ])
}

const acceptRequest = async (id: number) => {
  try {
    await friendStore.acceptFriendRequest(id)
    ElMessage.success('已添加为好友')
  } catch (error: any) {
    ElMessage.error(error?.message || '同意好友请求失败')
  }
}

const rejectRequest = async (id: number) => {
  try {
    const { value } = await ElMessageBox.prompt('可以填写拒绝理由（可选）', '拒绝好友请求', {
      confirmButtonText: '拒绝',
      cancelButtonText: '取消',
      inputPlaceholder: '暂时不方便添加'
    })
    await friendStore.rejectFriendRequest(id, value)
    ElMessage.success('已拒绝好友请求')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '拒绝好友请求失败')
    }
  }
}

const cancelRequest = async (id: number) => {
  try {
    await friendStore.cancelFriendRequest(id)
    ElMessage.success('已取消好友请求')
  } catch (error: any) {
    ElMessage.error(error?.message || '取消好友请求失败')
  }
}

const isPending = (status: FriendRequestStatus) => status === 'PENDING' || status === 0

const formatRequestStatus = (status: FriendRequestStatus) => {
  if (status === 'PENDING' || status === 0) return '等待对方验证'
  if (status === 'ACCEPTED' || status === 1) return '对方已通过'
  if (status === 'REJECTED' || status === 2) return '对方已拒绝'
  if (status === 'CANCELED' || status === 3) return '已取消'
  return String(status)
}

const formatTime = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

onMounted(() => {
  refreshRequests().catch(() => {})
})
</script>

<style scoped lang="scss">
.module-pane {
  width: 320px;
  border-right: 1px solid var(--border-light);
  background: var(--bg-white);
  display: flex;
  flex-direction: column;
}

.pane-header {
  padding: 14px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-light);
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.list-wrap {
  flex: 1;
  padding: 8px;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 4px;

  &:hover {
    background: var(--bg-light);
  }
}

.meta {
  flex: 1;
  min-width: 0;
}

.name {
  font-weight: 600;
}

.sub {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  padding-top: 30px;
}

.request-card {
  margin-bottom: 12px;
  padding: 10px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-lighter);
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 4px;
}

.request-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 8px;
  }
}

.request-empty {
  color: var(--text-secondary);
  font-size: 12px;
  padding: 6px 0;
}

.request-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--border-light);
}

.request-meta {
  flex: 1;
  min-width: 0;
}

.request-name {
  font-size: 13px;
  font-weight: 600;
}

.request-message,
.request-time {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.request-actions {
  display: flex;
  gap: 4px;
}
</style>

