<template>
  <div class="workspace">
    <div class="workspace-aurora aurora-one"></div>
    <div class="workspace-aurora aurora-two"></div>
    <div class="workspace-grid"></div>
    <PrimaryNav :active-module="activeModule" @change="activeModule = $event" />
    <ConversationListPane v-if="activeModule === 'conversation'" />
    <FriendModulePane v-else-if="activeModule === 'friend'" />
    <RoomModulePane v-else />
    <ConversationPanel />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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
}

.aurora-one {
  width: 300px;
  height: 300px;
  left: -120px;
  bottom: -140px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.24), transparent 70%);
}

.aurora-two {
  width: 360px;
  height: 360px;
  right: -120px;
  top: -160px;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.18), transparent 70%);
}

.workspace-grid {
  inset: 0;
  opacity: 0.8;
  background-image:
    linear-gradient(var(--workspace-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--workspace-grid) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at center, #000 0%, transparent 74%);
}
</style>

