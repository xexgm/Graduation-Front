<template>
  <div class="friend-list-container">
    <div class="header">
      <h3>我的好友</h3>
      <el-button type="primary" size="small" @click="showAddDialog = true">添加</el-button>
    </div>

    <el-scrollbar class="list-scrollbar">
      <div v-if="friendStore.friends.length === 0" class="empty-state">
        <el-empty description="暂无好友" :image-size="60" />
      </div>
      
      <div 
        v-for="friend in friendStore.friends" 
        :key="friend.userId"
        class="friend-item"
        :class="{ active: friendStore.activeFriendId === friend.userId }"
        @click="selectFriend(friend.userId)"
      >
        <el-badge :value="friendStore.unreadCounts[friend.userId] || 0" :hidden="!friendStore.unreadCounts[friend.userId]">
          <el-avatar :size="40" :src="friend.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${friend.nickname}`" />
        </el-badge>
        
        <div class="friend-info">
          <div class="friend-name-row">
            <span class="name">{{ friend.nickname || friend.username }}</span>
            <span class="status-dot" :class="{ online: friend.status === 1 }"></span>
          </div>
          <span class="signature text-ellipsis">{{ friend.signature || '这个人很懒，什么都没写' }}</span>
        </div>

        <div class="friend-actions">
          <el-popconfirm title="确定删除该好友吗？" @confirm.stop="removeFriend(friend.userId)">
            <template #reference>
              <el-button type="danger" size="small" circle @click.stop>
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>
    </el-scrollbar>

    <!-- 添加好友弹窗 -->
    <el-dialog v-model="showAddDialog" title="添加好友" width="30%">
      <el-form :model="addForm" @submit.prevent="handleAddFriend">
        <el-form-item label="好友ID">
          <el-input v-model.number="addForm.friendId" placeholder="请输入用户ID" type="number" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" @click="handleAddFriend" :loading="adding">
            确认添加
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFriendStore } from '@/stores/friend'
import { Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const friendStore = useFriendStore()

const showAddDialog = ref(false)
const adding = ref(false)
const addForm = ref({
  friendId: null as number | null
})

onMounted(() => {
  friendStore.fetchFriends()
})

const selectFriend = async (friendId: number) => {
  const normalizedFriendId = Number(friendId)
  if (!Number.isFinite(normalizedFriendId) || normalizedFriendId <= 0) {
    console.warn('无效的好友ID，无法打开私聊窗口:', friendId)
    return
  }
  await friendStore.openPrivateChat(normalizedFriendId)
}

const handleAddFriend = async () => {
  if (!addForm.value.friendId) {
    ElMessage.warning('请输入好友ID')
    return
  }
  
  adding.value = true
  try {
    const success = await friendStore.addFriend(addForm.value.friendId)
    if (success) {
      ElMessage.success('添加成功')
      showAddDialog.value = false
      addForm.value.friendId = null
    }
  } catch (error: any) {
    ElMessage.error(error.message || '添加失败')
  } finally {
    adding.value = false
  }
}

const removeFriend = async (friendId: number) => {
  try {
    const success = await friendStore.removeFriend(friendId)
    if (success) {
      ElMessage.success('删除成功')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败')
  }
}
</script>

<style scoped lang="scss">
.friend-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  border-right: 1px solid var(--border-color);
}

.header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  
  h3 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary);
  }
}

.list-scrollbar {
  flex: 1;
}

.empty-state {
  padding: 40px 0;
}

.friend-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;

  &:hover {
    background-color: var(--bg-color-hover);
    
    .friend-actions {
      opacity: 1;
    }
  }

  &.active {
    background-color: var(--primary-light);
  }
}

.friend-info {
  margin-left: 12px;
  flex: 1;
  min-width: 0;

  .friend-name-row {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    
    .name {
      font-weight: 500;
      color: var(--text-primary);
      margin-right: 8px;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #909399; // offline
      
      &.online {
        background-color: #67C23A; // online
      }
    }
  }

  .signature {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.friend-actions {
  opacity: 0;
  transition: opacity 0.3s;
}
</style>
