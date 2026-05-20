import { apiUtils } from '@/api'

const withTokenIfNeeded = (url: string): string => {
  if (!url.includes('/file/download/')) return url
  if (url.includes('token=')) return url

  const token = apiUtils.getToken()
  if (!token) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}token=${encodeURIComponent(token)}`
}

export const toApiAssetUrl = (url?: string): string | undefined => {
  if (!url) return undefined
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url
  }
  if (/^https?:\/\//i.test(url)) {
    return withTokenIfNeeded(url)
  }

  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
  if (url.startsWith('/api/')) {
    return withTokenIfNeeded(url)
  }
  if (url.startsWith('/')) {
    return withTokenIfNeeded(`${baseURL}${url}`)
  }
  return url
}

export const buildFileDownloadUrl = (fileId: number): string => {
  return `/file/download/${fileId}`
}
