<template>
  <div class="module-pane">
    <div class="pane-header">
      <div class="title">好友</div>
      <el-button size="small" type="primary" @click="showAddDialog = true">添加好友</el-button>
    </div>

    <el-scrollbar class="list-wrap">
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
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" :loading="adding" @click="handleAddFriend">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import { useConversationStore } from '@/stores/conversation'
import { useFriendStore } from '@/stores/friend'

const friendStore = useFriendStore()
const conversationStore = useConversationStore()

const showAddDialog = ref(false)
const adding = ref(false)
const friendIdInput = ref<number | null>(null)

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
    const ok = await friendStore.addFriend(friendId)
    if (ok) {
      ElMessage.success('添加好友成功')
      friendIdInput.value = null
      showAddDialog.value = false
      await friendStore.fetchFriends()
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '添加好友失败')
  } finally {
    adding.value = false
  }
}
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
</style>

