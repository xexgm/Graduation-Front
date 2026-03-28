# Implementation Plan: Frontend API Fix

## 1. 技术上下文 (Technical Context)
- **技术栈**: Vue 3 (Composition API), TypeScript, 原生 WebSocket。
- **架构**: 现有的 `src/websocket/index.ts` 承担了 WebSocket 的通信网关，封装了底层的通信报文体；`src/types/index.ts` 承载了全站接口的声明。
- **影响面**: 该次调整仅涉及类型定义的收口与建立连接、断开连接及聊天室逻辑内的消息字段拼装，不会引入新的库或造成现有 UI 组件层逻辑改动。

## 2. 设计规范检查 (Constitution Check)
| 原则 (Principle) | 是否符合 (Pass/Fail) | 理由 (Rationale) |
|---|---|---|
| 类型安全 (Type Safety) | Pass | 我们将移除类型声明中的 `\| null`，直接收拢为强类型的空字符串，增强安全性。 |
| 通信健壮性 (Robust Communication) | Pass | 断连前主动下发 `messageType: 1` 包通知服务端，有效解决了服务端网络幽灵连接（Ghost Connection）资源回收滞后的问题。 |

## 3. 实施路径 (Execution Path)

### 步骤 1: 修正基础类型声明 (`src/types/index.ts`)
- 将 `CompleteMessage` 接口中的 `content: string | null` 修改为 `content: string`。

### 步骤 2: 完善 WebSocket 封装服务 (`src/websocket/index.ts`)
- 修改 `sendLogicalConnection` 方法：附加 `toId: 0` 和 `content: ""`。
- 修改 `startHeartbeat` 方法：附加 `toId: 0`。
- 修改 `enterChatRoom` / `exitChatRoom` 方法：将 `content: null` 替换为 `content: ""`。
- 修改 `disconnect` 方法，实现主动通知断连逻辑。因为该方法可能无法访问到闭包范围外的 token，需设计从组件或是 `localStorage` 获取的方式，或者利用类内已存变量。
- （重构微调）：将 `connect` 时传入的 `uid` 和 `token` 保存到 `WebSocketService` 实例中，以便在全局 `disconnect` 时能够成功构造断连包体。

### 步骤 3: 调整相关业务调用端 (`src/stores/user.ts` 或其他组件)
- 如果原来调用 `disconnect` 的地方因为传参或使用方式有所变化，则对应更新。不过按照本设计，如果将参数保留为内部状态，外部调用 `disconnect()` 无需变更签名，风险降到最低。

## 4. 交付验证 (Delivery Validation)
- 检查 `npm run type-check` 或 `npm run build` 是否存在语法错误（尤其是原来的 `null` 赋值报错）。
- 代码走查：核对发送包格式是否符合后端定义的严格 JSON 约束（没有多余字段缺失，没有类型越界）。