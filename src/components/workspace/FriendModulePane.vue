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
              <el-avatar :size="32" :src="toApiAssetUrl(request.senderAvatarUrl)" @click.stop="openProfile(request.senderUserNo)">
                {{ (request.senderNickname || request.senderUsername || '?')[0] }}
              </el-avatar>
              <div class="request-meta">
                <div class="request-name">{{ request.senderNickname || request.senderUsername || `用户${request.senderId}` }}</div>
                <div v-if="request.senderUserNo" class="request-message">编号：{{ request.senderUserNo }}</div>
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
              <el-avatar :size="32" :src="toApiAssetUrl(request.receiverAvatarUrl)" @click.stop="openProfile(request.receiverUserNo)">
                {{ (request.receiverNickname || request.receiverUsername || '?')[0] }}
              </el-avatar>
              <div class="request-meta">
                <div class="request-name">{{ request.receiverNickname || request.receiverUsername || `用户${request.receiverId}` }}</div>
                <div v-if="request.receiverUserNo" class="request-message">编号：{{ request.receiverUserNo }}</div>
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
        <el-avatar :size="40" :src="friend.avatarUrl" @click.stop="openProfile(friend.userNo)">
          {{ (friend.nickname || friend.username || '?')[0] }}
        </el-avatar>
        <div class="meta">
          <div class="name">{{ friend.nickname || friend.username }}</div>
          <div class="sub">
            <span v-if="friend.userNo">编号 {{ friend.userNo }} · </span>{{ friend.signature || '这个人很懒，什么都没写' }}
          </div>
        </div>
      </div>

      <div v-if="friendStore.friends.length === 0" class="empty-state">
        <el-empty description="暂无好友" :image-size="80" />
      </div>
    </el-scrollbar>

    <el-dialog v-model="showAddDialog" title="添加好友" width="360px">
      <el-form @submit.prevent="handleAddFriend">
        <el-form-item label="用户编号">
          <el-input v-model="friendUserNoInput" maxlength="8" placeholder="请输入 8 位用户编号" />
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
import { useRouter } from 'vue-router'
import { useConversationStore } from '@/stores/conversation'
import { useFriendStore } from '@/stores/friend'
import type { FriendRequestStatus } from '@/types'
import { toApiAssetUrl } from '@/utils/url'

const friendStore = useFriendStore()
const conversationStore = useConversationStore()
const router = useRouter()

const showAddDialog = ref(false)
const adding = ref(false)
const friendUserNoInput = ref('')
const friendRequestMessage = ref('')
const activeRequestTab = ref<'received' | 'sent'>('received')

const openPrivate = async (friendId: number) => {
  await conversationStore.openPrivateByFriendId(friendId)
}

const openProfile = (userNo?: string) => {
  if (!userNo) {
    ElMessage.warning('该用户暂无用户编号')
    return
  }
  router.push(`/profile/${userNo}`)
}

const handleAddFriend = async () => {
  const friendUserNo = friendUserNoInput.value.trim()
  if (!/^1\d{7}$/.test(friendUserNo)) {
    ElMessage.warning('请输入以 1 开头的 8 位用户编号')
    return
  }

  adding.value = true
  try {
    const ok = await friendStore.sendFriendRequestByUserNo(friendUserNo, friendRequestMessage.value.trim() || undefined)
    if (ok) {
      ElMessage.success('好友请求已发送')
      friendUserNoInput.value = ''
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

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
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

  .el-avatar,
  .meta {
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

.meta {
  flex: 1;
  min-width: 0;
}

.name {
  font-weight: 600;
  color: var(--text-primary);
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
  padding: 12px;
  border: 1px solid var(--workspace-border);
  border-radius: 18px;
  background: var(--workspace-panel-muted);
  transition: border-color 0.24s ease, box-shadow 0.24s ease, transform 0.24s ease;

  &:hover {
    border-color: rgba(59, 130, 246, 0.28);
    box-shadow: 0 12px 24px var(--workspace-glow);
    transform: translateY(-1px);
  }
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.request-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 8px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    background-color: var(--workspace-border);
  }

  :deep(.el-tabs__item) {
    color: var(--text-secondary);
  }

  :deep(.el-tabs__item.is-active) {
    color: var(--brand-primary);
    font-weight: 700;
  }

  :deep(.el-tabs__active-bar) {
    background-color: var(--brand-primary);
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
  border-top: 1px solid var(--workspace-border);
}

.request-meta {
  flex: 1;
  min-width: 0;
}

.request-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
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

@media (prefers-reduced-motion: reduce) {
  .friend-item,
  .friend-item::before,
  .friend-item .el-avatar,
  .request-card {
    transition: none;
  }

  .friend-item:hover,
  .friend-item:hover .el-avatar,
  .request-card:hover {
    transform: none;
  }
}
</style>

