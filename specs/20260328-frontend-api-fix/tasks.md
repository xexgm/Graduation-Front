# Task Breakdown: Frontend API Fix

## 1. Setup & Infrastructure (Phase 1)
因为该需求只是在现有基础之上做类型与字段逻辑修复，不需要配置新的基础设施，但需要在调整前确立基础类型。

| Task ID | Description | File/Module | Related Story | Parallel |
|---------|-------------|-------------|---------------|----------|
| T001    | [x] 修改 `CompleteMessage` 类型接口定义，将 `content: string \| null` 强制更新为 `content: string`，并确认其他关联字段如 `toId` 允许传数字 0 | `src/types/index.ts` | All | 否 |

---

## 2. Foundational Tasks (Phase 2)
这些前置修改是 WebSocket 业务线所有服务的基础依赖，必须优先完成。

| Task ID | Description | File/Module | Related Story | Parallel |
|---------|-------------|-------------|---------------|----------|
| T002    | [x] 重构 `WebSocketService` 内部状态，使其在 `connect()` 时保存传入的 `uid` 与 `token` 为类成员变量，以便于在全局方法（如 disconnect）内进行访问 | `src/websocket/index.ts` | US1, US2 | 否 |

---

## 3. User Story 1: 建立 WebSocket 连接并维持心跳 (Phase 3)
**目标:** 客户端成功向后端握手建立连接，并定时发送有效的心跳包。

| Task ID | Description | File/Module | Related Story | Parallel |
|---------|-------------|-------------|---------------|----------|
| T003    | [x] 修复建连包：修改 `sendLogicalConnection` 方法中的发包载荷，添加 `toId: 0` 和 `content: ""` | `src/websocket/index.ts` | US1 | 否 |
| T004    | [x] 修复心跳包：修改 `startHeartbeat` 方法中的定时发包载荷，添加 `toId: 0` | `src/websocket/index.ts` | US1 | 否 |

---

## 4. User Story 2: 安全断开 WebSocket 连接 (Phase 4)
**目标:** 客户端在退出登录或页面销毁时，可以主动下发网络销毁通知包，再关闭 socket 实例。

| Task ID | Description | File/Module | Related Story | Parallel |
|---------|-------------|-------------|---------------|----------|
| T005    | [x] 重构 `disconnect` 逻辑：在执行 `this.ws.close()` 前，利用类成员变量 `this.uid` 和 `this.token`，组装发送 `messageType: 1`, `toId: 0`, `content: ""` 的注销报文 | `src/websocket/index.ts` | US2 | 否 |

---

## 5. User Story 3: 聊天室业务消息 (Phase 5)
**目标:** 修正进入与退出聊天室时发送包含 null 的脏数据问题。

| Task ID | Description | File/Module | Related Story | Parallel |
|---------|-------------|-------------|---------------|----------|
| T006    | [x] 修复入群发包：修改 `enterChatRoom` 方法发包载荷，将 `content: null` 替换为 `content: ""` | `src/websocket/index.ts` | US3 | [P] |
| T007    | [x] 修复退群发包：修改 `exitChatRoom` 方法发包载荷，将 `content: null` 替换为 `content: ""` | `src/websocket/index.ts` | US3 | [P] |

---

## 6. Polish & Cross-Cutting (Final Phase)
处理因类型修改带来的 TypeScript 报错，保证构建通过。

| Task ID | Description | File/Module | Related Story | Parallel |
|---------|-------------|-------------|---------------|----------|
| T008    | [x] 全局类型校验修正：运行 `npm run type-check` 扫描现有调用是否存在向 `content` 传递 `null` 的报错，并将其修正为 `""` | 全局 | All | 否 |

---

## 7. Dependencies & Execution Order
执行顺序如下：
- **第一层**: `T001` 建立合规类型
- **第二层**: `T002` 铺垫 WebSocket 内部凭证状态
- **第三层**: `T003`, `T004` (处理握手/心跳)
- **第四层**: `T005`, `T006`, `T007` (处理断连与聊天室报文，可并行修改)
- **第五层**: `T008` (最终编译与类型校验)

---

## 8. Implementation Strategy
此修复属于敏捷变更，不涉及新建模块，直接在现有文件 `src/types/index.ts` 和 `src/websocket/index.ts` 中渐进修改。建议一步到位，即在单次提交中包含所有修改然后统一进行 TypeScript 类型检查。