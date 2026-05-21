<template>
  <div
    class="workspace"
    :style="workspaceVars"
    @pointermove="handlePointerMove"
    @pointerleave="resetPointerEffect"
  >
    <div class="workspace-aurora aurora-one"></div>
    <div class="workspace-aurora aurora-two"></div>
    <div class="workspace-grid"></div>
    <PrimaryNav :active-module="activeModule" @change="activeModule = $event" />
    <Transition name="pane-switch" mode="out-in">
      <ConversationListPane v-if="activeModule === 'conversation'" key="conversation" />
      <FriendModulePane v-else-if="activeModule === 'friend'" key="friend" />
      <RoomModulePane v-else key="room" />
    </Transition>
    <ConversationPanel />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import PrimaryNav from '@/components/workspace/PrimaryNav.vue'
import ConversationListPane from '@/components/workspace/ConversationListPane.vue'
import ConversationPanel from '@/components/workspace/ConversationPanel.vue'
import FriendModulePane from '@/components/workspace/FriendModulePane.vue'
import RoomModulePane from '@/components/workspace/RoomModulePane.vue'
import { useChatStore } from '@/stores/chat'
import { useFriendStore } from '@/stores/friend'
import { useSystemNoticeStore } from '@/stores/systemNotice'

const chatStore = useChatStore()
const friendStore = useFriendStore()
const systemNoticeStore = useSystemNoticeStore()
const activeModule = ref<'conversation' | 'friend' | 'room'>('conversation')
const pointerState = reactive({
  x: 0.5,
  y: 0.5,
  active: false
})

const clamp = (value: number) => Math.min(Math.max(value, 0), 1)

const workspaceVars = computed<Record<string, string>>(() => {
  const moveX = pointerState.active ? pointerState.x - 0.5 : 0
  const moveY = pointerState.active ? pointerState.y - 0.5 : 0

  return {
    '--workspace-mouse-x': `${pointerState.x * 100}%`,
    '--workspace-mouse-y': `${pointerState.y * 100}%`,
    '--workspace-spotlight-opacity': pointerState.active ? '1' : '0',
    '--workspace-parallax-x': `${moveX * 16}px`,
    '--workspace-parallax-y': `${moveY * 14}px`,
    '--workspace-parallax-x-soft': `${moveX * -10}px`,
    '--workspace-parallax-y-soft': `${moveY * -8}px`,
    '--workspace-grid-x': `${moveX * 8}px`,
    '--workspace-grid-y': `${moveY * 8}px`
  }
})

const handlePointerMove = (event: PointerEvent) => {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return

  const rect = target.getBoundingClientRect()
  pointerState.x = clamp((event.clientX - rect.left) / rect.width)
  pointerState.y = clamp((event.clientY - rect.top) / rect.height)
  pointerState.active = true
}

const resetPointerEffect = () => {
  pointerState.x = 0.5
  pointerState.y = 0.5
  pointerState.active = false
}

onMounted(async () => {
  await Promise.all([
    chatStore.fetchRooms(),
    friendStore.fetchFriends(),
    friendStore.fetchUnreadCounts()
  ])

  await Promise.allSettled([
    chatStore.fetchRoomUnreadCounts(),
    friendStore.fetchPrivateLatestMessages(),
    chatStore.fetchRoomLatestMessages()
  ])

  try {
    await chatStore.initWebSocket()
  } catch (error) {
    console.error('Workspace init websocket failed:', error)
  }

  friendStore.initFriendWebSocket()
  systemNoticeStore.initSystemNoticeWebSocket()
  friendStore.startFriendPolling(5000)
})

onUnmounted(() => {
  friendStore.stopFriendPolling()
  systemNoticeStore.stopSystemNoticeWebSocket()
})
</script>

<style scoped lang="scss">
.workspace {
  --workspace-mouse-x: 50%;
  --workspace-mouse-y: 50%;
  --workspace-spotlight-opacity: 0;
  --workspace-parallax-x: 0px;
  --workspace-parallax-y: 0px;
  --workspace-parallax-x-soft: 0px;
  --workspace-parallax-y-soft: 0px;
  --workspace-grid-x: 0px;
  --workspace-grid-y: 0px;

  height: 100vh;
  display: flex;
  overflow: hidden;
  position: relative;
  padding: 12px;
  gap: 12px;
  background:
    radial-gradient(circle at 18% 18%, var(--workspace-glow), transparent 28%),
    radial-gradient(circle at 88% 8%, rgba(139, 92, 246, 0.12), transparent 30%),
    linear-gradient(135deg, var(--workspace-bg) 0%, var(--workspace-bg-soft) 100%);
  color: var(--text-primary);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at var(--workspace-mouse-x) var(--workspace-mouse-y), var(--workspace-glow), transparent 32%),
      radial-gradient(circle at var(--workspace-mouse-x) var(--workspace-mouse-y), var(--workspace-glow-soft), transparent 46%);
    opacity: var(--workspace-spotlight-opacity);
    transition: opacity 0.35s ease;
    pointer-events: none;
  }
}

.workspace > :not(.workspace-aurora):not(.workspace-grid) {
  position: relative;
  z-index: 1;
}

.workspace-aurora,
.workspace-grid {
  position: absolute;
  pointer-events: none;
}

.workspace-aurora {
  border-radius: 999px;
  filter: blur(20px);
  opacity: 0.75;
  transition: transform 0.22s ease-out;
  will-change: transform;
}

.aurora-one {
  width: 300px;
  height: 300px;
  left: -120px;
  bottom: -140px;
  background: radial-gradient(circle, var(--workspace-glow-strong), transparent 70%);
  transform: translate3d(var(--workspace-parallax-x-soft), var(--workspace-parallax-y-soft), 0);
}

.aurora-two {
  width: 360px;
  height: 360px;
  right: -120px;
  top: -160px;
  background: radial-gradient(circle, var(--workspace-glow-soft), transparent 70%);
  transform: translate3d(var(--workspace-parallax-x), var(--workspace-parallax-y), 0);
}

.workspace-grid {
  inset: -18px;
  opacity: 0.8;
  background-image:
    linear-gradient(var(--workspace-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--workspace-grid) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at center, #000 0%, transparent 74%);
  transform: translate3d(var(--workspace-grid-x), var(--workspace-grid-y), 0);
  transition: transform 0.22s ease-out;
  will-change: transform;
}

.pane-switch-enter-active,
.pane-switch-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.pane-switch-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.pane-switch-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

@media (prefers-reduced-motion: reduce) {
  .workspace::before {
    display: none;
  }

  .workspace-aurora,
  .workspace-grid,
  .pane-switch-enter-active,
  .pane-switch-leave-active {
    transition: none;
    transform: none !important;
  }
}
</style>

