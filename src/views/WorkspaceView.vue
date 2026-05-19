<template>
  <div class="workspace">
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
}
</style>

