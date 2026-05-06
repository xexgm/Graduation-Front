import type { AudioMessagePayload, CompleteMessage, FileMessagePayload, Message, UploadFileInfo } from '@/types'

export const buildFileMessageContent = (fileInfo: UploadFileInfo): string => {
  const payload: FileMessagePayload = {
    messageKind: 'FILE',
    fileId: fileInfo.fileId,
    fileName: fileInfo.fileName,
    fileSize: fileInfo.fileSize,
    contentType: fileInfo.contentType
  }

  return JSON.stringify(payload)
}

export const parseFileMessageContent = (content: string): FileMessagePayload | null => {
  try {
    const payload = JSON.parse(content) as Partial<FileMessagePayload>
    if (payload.messageKind !== 'FILE' || !payload.fileId || !payload.fileName) {
      return null
    }

    return {
      messageKind: 'FILE',
      fileId: Number(payload.fileId),
      fileName: String(payload.fileName),
      fileSize: Number(payload.fileSize || 0),
      contentType: payload.contentType ? String(payload.contentType) : undefined
    }
  } catch {
    return null
  }
}

export const buildAudioMessageContent = (fileInfo: UploadFileInfo, duration: number): string => {
  const payload: AudioMessagePayload = {
    messageKind: 'AUDIO',
    fileId: fileInfo.fileId,
    fileName: fileInfo.fileName,
    fileSize: fileInfo.fileSize,
    contentType: fileInfo.contentType,
    duration
  }

  return JSON.stringify(payload)
}

export const parseAudioMessageContent = (content: string): AudioMessagePayload | null => {
  try {
    const payload = JSON.parse(content) as Partial<AudioMessagePayload>
    if (!payload.fileId || !payload.fileName || !payload.duration) {
      return null
    }

    return {
      messageKind: 'AUDIO',
      fileId: Number(payload.fileId),
      fileName: String(payload.fileName),
      fileSize: Number(payload.fileSize || 0),
      contentType: payload.contentType ? String(payload.contentType) : undefined,
      duration: Number(payload.duration)
    }
  } catch {
    return null
  }
}

export const resolveMessageType = (message: CompleteMessage): Message['type'] => {
  if ((message.appId === 1 && message.messageType === 4) || (message.appId === 2 && message.messageType === 3)) {
    return 'audio'
  }

  const audioPayload = parseAudioMessageContent(message.content)
  if (audioPayload?.messageKind === 'AUDIO') {
    return 'audio'
  }

  if (parseFileMessageContent(message.content)) {
    return 'file'
  }

  if ((message.appId === 1 && message.messageType === 3) || (message.appId === 2 && message.messageType === 2)) {
    return 'file'
  }

  return 'text'
}

export const formatFileSize = (size: number): string => {
  if (!Number.isFinite(size) || size <= 0) return '未知大小'

  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  const digits = unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

export const formatAudioDuration = (duration: number): string => {
  if (!Number.isFinite(duration) || duration <= 0) return "0''"
  return `${Math.round(duration)}''`
}
