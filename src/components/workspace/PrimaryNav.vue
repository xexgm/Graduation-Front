<template>
  <div class="primary-nav">
    <div class="brand-dot" aria-label="光芒IM">
      <span class="minimal-logo"></span>
    </div>
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
  width: 72px;
  border: 1px solid var(--workspace-border);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  background: var(--workspace-nav);
  box-shadow: var(--workspace-shadow);
  backdrop-filter: blur(22px);
}

.brand-dot {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
  box-shadow: 0 14px 30px var(--workspace-glow);
}

.minimal-logo {
  position: relative;
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;

  &::before {
    content: '';
    position: absolute;
    right: -3px;
    bottom: 1px;
    width: 8px;
    height: 8px;
    border-right: 2px solid rgba(255, 255, 255, 0.92);
    border-bottom: 2px solid rgba(255, 255, 255, 0.92);
    transform: rotate(10deg);
  }

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.85);
    transform: translate(-50%, -50%);
  }
}

.nav-top,
.nav-bottom {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-item {
  width: 42px;
  height: 42px;
  border: 1px solid transparent;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  background: var(--workspace-panel-muted);
  transition: var(--transition-all);

  &.active {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.22);
    background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
    box-shadow: 0 12px 26px var(--workspace-glow);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:not(.disabled) {
    cursor: pointer;

    &:hover {
      color: var(--brand-primary);
      border-color: var(--workspace-border);
      transform: translateY(-1px);
      background: var(--workspace-card-hover);
    }
  }
}
</style>

