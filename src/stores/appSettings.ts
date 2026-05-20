import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const SOUND_ENABLED_KEY = 'app_sound_enabled'
const NOTIFICATIONS_ENABLED_KEY = 'app_notifications_enabled'

export const useAppSettingsStore = defineStore('appSettings', () => {
  const notificationsEnabled = ref(localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) !== 'false')
  const soundEnabled = ref(localStorage.getItem(SOUND_ENABLED_KEY) !== 'false')

  watch(notificationsEnabled, (enabled) => {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled))
  })

  watch(soundEnabled, (enabled) => {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
  })

  async function playNotificationSound() {
    if (!soundEnabled.value) return

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return

    try {
      const audioContext = new AudioContextClass()
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const gain = audioContext.createGain()
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22)
      gain.connect(audioContext.destination)

      const firstTone = audioContext.createOscillator()
      firstTone.type = 'sine'
      firstTone.frequency.setValueAtTime(740, audioContext.currentTime)
      firstTone.connect(gain)
      firstTone.start()
      firstTone.stop(audioContext.currentTime + 0.12)

      const secondTone = audioContext.createOscillator()
      secondTone.type = 'sine'
      secondTone.frequency.setValueAtTime(980, audioContext.currentTime + 0.09)
      secondTone.connect(gain)
      secondTone.start(audioContext.currentTime + 0.09)
      secondTone.stop(audioContext.currentTime + 0.22)

      window.setTimeout(() => {
        audioContext.close().catch(() => {})
      }, 350)
    } catch (error) {
      console.warn('播放消息提示音失败:', error)
    }
  }

  function setNotificationsEnabled(enabled: boolean) {
    notificationsEnabled.value = enabled
  }

  function setSoundEnabled(enabled: boolean) {
    soundEnabled.value = enabled
    if (enabled) {
      playNotificationSound()
    }
  }

  return {
    notificationsEnabled,
    soundEnabled,
    setNotificationsEnabled,
    setSoundEnabled,
    playNotificationSound
  }
})
