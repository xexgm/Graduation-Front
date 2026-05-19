import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { voiceApi } from '@/api'
import type { VoiceTranscriptionState, VoiceTranscriptionStatus } from '@/types'

export const useVoiceTranscriptionStore = defineStore('voiceTranscription', () => {
  const transcriptionMap = reactive<Record<number, VoiceTranscriptionState>>({})

  function getState(fileId?: number): VoiceTranscriptionState | undefined {
    if (!fileId) return undefined
    return transcriptionMap[fileId]
  }

  function isSuccess(status: VoiceTranscriptionStatus) {
    return status === 'SUCCESS' || status === 1
  }

  async function transcribe(fileId: number) {
    const current = transcriptionMap[fileId]
    if (current?.loading) return
    if (current?.text) return

    transcriptionMap[fileId] = {
      loading: true,
      text: current?.text,
      error: undefined,
      expanded: true
    }

    try {
      const response = await voiceApi.transcribe({ fileId })
      const data = response.data

      if (response.code === 200 && data && isSuccess(data.status) && data.text?.trim()) {
        transcriptionMap[fileId] = {
          loading: false,
          text: data.text.trim(),
          error: undefined,
          expanded: true
        }
        return
      }

      transcriptionMap[fileId] = {
        loading: false,
        text: undefined,
        error: response.message || '未识别到有效语音',
        expanded: true
      }
    } catch (error: any) {
      const message = error?.message?.includes('timeout')
        ? '识别耗时较长，请稍后重试'
        : error?.message || '识别失败，请重试'
      transcriptionMap[fileId] = {
        loading: false,
        text: undefined,
        error: message,
        expanded: true
      }
    }
  }

  async function toggle(fileId: number) {
    const current = transcriptionMap[fileId]
    if (current?.loading) return

    if (current?.text || current?.error) {
      current.expanded = !current.expanded
      return
    }

    await transcribe(fileId)
  }

  function getButtonText(fileId?: number) {
    if (!fileId) return '转文字'
    const state = transcriptionMap[fileId]
    if (state?.loading) return '识别中'
    if (state?.text || state?.error) return state.expanded ? '收起' : '展开'
    return '转文字'
  }

  return {
    transcriptionMap,
    getState,
    transcribe,
    toggle,
    getButtonText
  }
})
