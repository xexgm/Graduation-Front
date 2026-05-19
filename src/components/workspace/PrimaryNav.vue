<template>
  <div class="primary-nav">
    <div class="nav-top">
      <div
        class="nav-item"
        :class="{ active: activeModule === 'conversation' }"
        title="会话"
        @click="emit('change', 'conversation')"
      >
        <el-icon><ChatDotRound /></el-icon>
      </div>
      <div
        class="nav-item"
        :class="{ active: activeModule === 'friend' }"
        title="好友"
        @click="emit('change', 'friend')"
      >
        <el-icon><User /></el-icon>
      </div>
      <div
        class="nav-item"
        :class="{ active: activeModule === 'room' }"
        title="聊天室"
        @click="emit('change', 'room')"
      >
        <el-icon><Grid /></el-icon>
      </div>
    </div>
    <div class="nav-bottom">
      <div v-if="isAdmin" class="nav-item" title="管理员后台" @click="router.push('/admin')">
        <el-icon><Management /></el-icon>
      </div>
      <div class="nav-item" title="设置" @click="router.push('/settings')">
        <el-icon><Setting /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChatDotRound, Grid, Management, Setting, User } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

defineProps<{
  activeModule: 'conversation' | 'friend' | 'room'
}>()

const emit = defineEmits<{
  change: [module: 'conversation' | 'friend' | 'room']
}>()

const router = useRouter()
const userStore = useUserStore()
const isAdmin = computed(() => [1, 2].includes(Number(userStore.user?.role)))
</script>

<style scoped lang="scss">
.primary-nav {
  width: 64px;
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  background: var(--bg-white);
}

.nav-top,
.nav-bottom {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-item {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  background: var(--bg-light);

  &.active {
    color: #fff;
    background: var(--primary-color);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:not(.disabled) {
    cursor: pointer;
  }
}
</style>

