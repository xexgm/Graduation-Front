# Feature Specification: Frontend API Fix

**Feature Name**: frontend-api-fix
**Date**: 2026-03-28
**Status**: DRAFT

## 1. 概述 (Overview)

**背景 (Context)**
当前端项目与后端通过 WebSocket 和 HTTP 接口进行通信时，由于前端代码实现细节与后端最新接口规范（`NETTY_API_DOCS.md` 和 `FRONTEND_API_DOCS.md`）不完全一致，导致存在部分错误。需要通过修正前台接口调用和消息体结构来保证两者交互顺畅。

**目标 (Objectives)**
对现有的 Vue 3 + TypeScript 前端项目进行调整，修正 `WebSocket` 和 `HTTP` 接口与后端的交互细节，使之符合最新的后端接口文档标准。

**输入来源 (Input)**
当前目录下是一个前端项目,它需要和我的后端进行交互,当前的前端项目存在一些接口细节上的错误,请你阅读关于后端的两篇文档,一篇是对后端的介绍,一篇是关于和后端接口交互的细节,他们的地址分别是：
1. /Users/bytedance/JavaProject/Graduation/NETTY_API_DOCS.md
2. /Users/bytedance/JavaProject/Graduation/FRONTEND_API_DOCS.md
请以文档为主,修改当前前端项目。

---

## 2. 用户场景与测试 (User Scenarios & Testing)

### 场景 1：建立 WebSocket 连接并维持心跳
- **描述**: 用户在登录后，前端发起 WebSocket 连接。建立连接与发送心跳时，必须符合最新的 `CompleteMessage` 格式，`content` 应为空字符串而非 `null`，且必须补充 `toId: 0` 字段。
- **前置条件**: 用户已成功获取到 `token` 和 `uid`。
- **步骤**:
  1. 实例化 `WebSocket` 客户端并连接到 `ws://<host>:9999/ws?token=<token>`。
  2. 发送业务线 `appId: 0`, `messageType: 0` (建连)，确保 `content: ""` 和 `toId: 0`。
  3. 定时发送 `appId: 0`, `messageType: 2` (心跳)，确保包含 `toId: 0`。
- **预期结果**: 后端能够正确解析请求，成功建立逻辑连接并响应维持心跳。
- **技术实现细节**: 修改 `src/websocket/index.ts` 中的 `CompleteMessage` 消息体组装，加入 `toId: 0`，将 `content: null` 改为 `content: ""`。在 `connect` 方法调用时，需要记录 `uid` 和 `token` 以便后续复用。

### 场景 2：安全断开 WebSocket 连接
- **描述**: 用户手动退出或浏览器注销时，应该主动发送断开连接的消息给后端，然后再关闭 socket。
- **前置条件**: WebSocket 处于连接状态。
- **步骤**:
  1. 前端触发 `disconnect` 方法。
  2. 方法内部主动发送 `appId: 0`, `messageType: 1`, `toId: 0`, `content: ""` 消息体给服务端。
  3. 关闭连接并停止心跳定时器。
- **预期结果**: 后端接收到明确的断开通知并清理服务端资源。
- **技术实现细节**: 在 `src/websocket/index.ts` 中的 `disconnect` 方法，增加向服务端发送断开消息 (messageType=1) 的逻辑。

### 场景 3：聊天室业务消息
- **描述**: 用户进入聊天室和退出聊天室。
- **步骤**:
  1. 触发 `enterChatRoom` 时，发送 `appId: 1`, `messageType: 0`, 目标房间设为 `toId`，`content` 改为 `""`。
  2. 触发 `exitChatRoom` 时，发送 `appId: 1`, `messageType: 2`, 目标房间设为 `toId`，`content` 改为 `""`。
- **技术实现细节**: 在 `src/websocket/index.ts` 修改对应方法参数中 `content: null` 的设定。将 `src/types/index.ts` 里 `content` 类型的声明 `string | null` 改回兼容 `string` 并强制赋值为空字符串。

---

## 3. 功能需求 (Functional Requirements)

1. **修正类型定义**: 
   - `src/types/index.ts` 中定义的 `CompleteMessage`，其 `content` 字段的规范要求修改，以防前端传出 null。`toId` 字段确保在发送到后端时一定存在（至少给默认值 0）。
2. **连接初始化修复**:
   - `WebSocketService` 内部保存 `uid` 和 `token` 状态。
   - `ws.connect()` 时发送的 `appId: 0` 的包，要附带 `toId: 0` 和 `content: ""`。
3. **心跳包修复**:
   - 心跳包内容需包含 `toId: 0`。
4. **断连逻辑修复**:
   - `disconnect()` 必须发送特定的注销包(`messageType: 1`)，然后再执行物理 `close()`。
5. **聊天室事件修复**:
   - 聊天室入室/退室包的 `content` 改为 `""` 而非 `null`。

---

## 4. 成功标准 (Success Criteria)

- **接口结构正确**: 所有的 WebSocket 消息体内不再含有 `content: null`，且都包含正确的 `toId` 字段（建连/心跳为 0）。
- **流程完备**: 客户端触发主动断连时，会发出 `messageType: 1` 的断开通信请求。
- **类型安全**: `typescript` 编译检查无报错，接口符合后端 API 文档所定规范。

---

## 5. 关键实体 (Key Entities)

- **CompleteMessage**: 所有的通信基类。
  - `appId`: `0` (Link) / `1` (ChatRoom)
  - `messageType`: `0` / `1` / `2`
  - `toId`: `0` 或聊天室 ID。
  - `content`: 字符串。

## 6. 假设与依赖 (Assumptions & Dependencies)
- 假设后端的 HTTP 接口部分除文档指出的改动外，其它 API (如 `/chatroom/list`) 已受后端支持并未发生变更，因为提供的前端文档主要规范了 `auth` 的登录和 websocket，没有覆盖完整的业务 HTTP 路由，因此不删除已有路由。
