<template>
  <div class="primary-nav">
    <div class="nav-brand">
      <div class="brand-dot" aria-label="光芒IM">
        <span class="minimal-logo"></span>
      </div>
      <el-popover placement="right-start" trigger="click" :width="260" popper-class="profile-popover">
        <template #reference>
          <el-avatar class="current-user-avatar" :size="42" :src="currentUserAvatar">
            {{ currentUserInitial }}
          </el-avatar>
        </template>
        <div class="profile-card-popover">
          <div class="profile-head">
            <el-avatar :size="54" :src="currentUserAvatar">{{ currentUserInitial }}</el-avatar>
            <div class="profile-basic">
              <div class="profile-name">{{ userStore.user?.nickname || userStore.user?.username || '未命名用户' }}</div>
              <div class="profile-username">@{{ userStore.user?.username || '-' }}</div>
            </div>
          </div>
          <div class="profile-info-row">
          <span>光芒ID</span>
            <strong>{{ userStore.user?.userNo || '暂无' }}</strong>
          </div>
          <div class="profile-signature">
            {{ userStore.user?.signature || '这个人很懒，什么都没写' }}
          </div>
          <div class="profile-actions">
            <el-button size="small" type="primary" @click="router.push('/profile/me')">我的资料</el-button>
            <el-button size="small" @click="router.push('/settings')">设置</el-button>
          </div>
        </div>
      </el-popover>
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
import { toApiAssetUrl } from '@/utils/url'

defineProps<{
  activeModule: 'conversation' | 'friend' | 'room'
}>()

const emit = defineEmits<{
  change: [module: 'conversation' | 'friend' | 'room']
}>()

const router = useRouter()
const userStore = useUserStore()
const isAdmin = computed(() => [1, 2].includes(Number(userStore.user?.role)))
const currentUserAvatar = computed(() => toApiAssetUrl(userStore.user?.avatarUrl))
const currentUserInitial = computed(() => (userStore.user?.nickname || userStore.user?.username || '?')[0])
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
  transition: border-color 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    border-color: rgba(59, 130, 246, 0.26);
    box-shadow: var(--workspace-shadow-hover);
  }
}

.nav-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.brand-dot {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
  box-shadow: 0 14px 30px var(--workspace-glow);
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 18px 34px var(--workspace-glow-strong);
  }
}

.current-user-avatar {
  margin-bottom: 2px;
  border: 2px solid var(--workspace-border);
  cursor: pointer;
  transition: var(--transition-all);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);

  &:hover {
    transform: translateY(-1px) scale(1.03);
    border-color: var(--brand-primary);
    box-shadow: 0 12px 28px var(--workspace-glow);
  }
}

.profile-card-popover {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-basic {
  min-width: 0;
}

.profile-name {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-username {
  color: var(--text-secondary);
  font-size: 12px;
}

.profile-info-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--text-secondary);
  background: var(--workspace-panel-muted);

  strong {
    color: var(--text-primary);
  }
}

.profile-signature {
  padding: 10px 12px;
  border: 1px solid var(--workspace-border);
  border-radius: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  background: var(--workspace-card);
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  background: var(--workspace-panel-muted);
  transition: var(--transition-all);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 35% 20%, rgba(255, 255, 255, 0.28), transparent 42%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .el-icon {
    position: relative;
    z-index: 1;
  }

  &.active {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.22);
    background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
    box-shadow: 0 12px 26px var(--workspace-glow);

    &::before {
      opacity: 1;
    }

    &::after {
      content: '';
      position: absolute;
      right: 5px;
      bottom: 5px;
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
    }
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
      transform: translateY(-2px);
      background: var(--workspace-card-hover);
      box-shadow: 0 10px 22px var(--workspace-glow);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .primary-nav,
  .brand-dot,
  .nav-item {
    transition: none;
  }

  .brand-dot:hover,
  .nav-item:not(.disabled):hover {
    transform: none;
  }
}
</style>

