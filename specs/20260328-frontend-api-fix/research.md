# Phase 0: Research & Clarifications

**Date**: 2026-03-28

## 1. 架构与依赖梳理

由于本次为特定错误修正（`frontend-api-fix`），并未引入全新的后端依赖或者库，所有的依赖调整依然基于目前的 Vue 3 和 原生 WebSocket 封装：

- **WebSocket**: 继续使用原生 `WebSocket` 类进行连接和心跳。
- **Type声明**: 对现有的 `src/types/index.ts` 强类型接口进行严谨化收口。

## 2. 详细澄清与决策

### 决策 1：`CompleteMessage.content` 字段的非空约束
- **背景**: 现有的 `src/types/index.ts` 中 `content: string | null` 导致建立连接、退群等动作向后端发包时传输了 `null`。
- **决定**: 将 `CompleteMessage` 类型中的 `content` 限定为 `string`，并在不需要具体消息内容时，传入空字符串 `""`。
- **影响**: 防止后端对 JSON 的 `content` 字段在反序列化时抛出空指针异常或者验证拦截。

### 决策 2：完善 `toId` 基础字段
- **背景**: 握手和心跳包因为属于全局消息（`appId: 0`），原本代码并未传递 `toId` 字段。但后端约定 `CompleteMessage` 要求所有的报文含有完整的字段。
- **决定**: 在所有的 `appId: 0` 发包场景（建连、断连、心跳），手动追加 `toId: 0`。
- **影响**: 保障数据类型的严格校验，对齐服务端要求。

### 决策 3：物理断连前的主动注销通知
- **背景**: 前端原 `disconnect()` 仅调用了 `ws.close()`，缺少逻辑登出动作，导致服务端可能误判客户端网络中断而不会立刻清理资源。
- **决定**: 修改 `src/websocket/index.ts` 中 `disconnect()` 方法：在发起 `ws.close()` 之前，先向 socket 抛出 `{ appId: 0, messageType: 1, toId: 0, content: "" }` 包。
- **影响**: 连接断开流程更加闭环，服务器能立即收到下线通知。