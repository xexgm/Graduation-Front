export type BuiltInEmojiOption = {
  token: string
  label: string
  symbol: string
  src: string
}

export const unicodeEmojiOptions = ['😀', '😂', '😭', '👍', '❤️', '🎉', '🥳', '😎', '🤝', '👏', '🔥', '✨']

const createEmojiSvg = (symbol: string, from: string, to: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${from}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#g)"/>
      <text x="32" y="41" text-anchor="middle" font-size="30" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${symbol}</text>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export const builtInEmojiOptions: BuiltInEmojiOption[] = [
  { token: '[smile]', label: '微笑', symbol: '😄', src: createEmojiSvg('😄', '#38bdf8', '#6366f1') },
  { token: '[cry]', label: '哭泣', symbol: '😭', src: createEmojiSvg('😭', '#60a5fa', '#8b5cf6') },
  { token: '[laugh]', label: '大笑', symbol: '😂', src: createEmojiSvg('😂', '#22c55e', '#14b8a6') },
  { token: '[angry]', label: '生气', symbol: '😠', src: createEmojiSvg('😠', '#fb7185', '#f97316') }
]

const builtInEmojiMap = new Map(builtInEmojiOptions.map(item => [item.token, item]))

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const renderMessageContent = (content: string) => {
  const escaped = escapeHtml(content).replace(/\n/g, '<br />')
  const tokenPattern = new RegExp(builtInEmojiOptions.map(item => escapeRegExp(item.token)).join('|'), 'g')

  return escaped.replace(tokenPattern, (token) => {
    const emoji = builtInEmojiMap.get(token)
    if (!emoji) return token
    return `<img src="${emoji.src}" alt="${escapeHtml(emoji.label)}" title="${escapeHtml(emoji.label)}" class="inline-emoji-img" />`
  })
}

export const formatEmojiPreview = (content: string) => {
  return content.replace(/\[(smile|cry|laugh|angry)\]/g, token => builtInEmojiMap.get(token)?.symbol || token)
}
