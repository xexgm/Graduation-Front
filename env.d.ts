/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_PROXY_TARGET?: string
  readonly VITE_WS_URL?: string
  readonly VITE_ENABLE_MOCK_AUTH?: string
  readonly VITE_ENABLE_MOCK_WS?: string
  readonly VITE_ENABLE_MOCK_DATA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}