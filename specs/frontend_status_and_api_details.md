# 前端项目架构与接口现状总结

本文档旨在梳理当前前端项目（Vue 3 + TypeScript）与后端交互（SpringBoot HTTP 接口 + Netty WebSocket 接口）的实际运行机制、接口联调细节及项目现状，以作为后续开发、维护和联调的标准参考。

## 1. 整体现状概述

当前项目已经打通了从用户鉴权到实时即时通讯（IM）的核心链路。前端能够成功实现：
1. **基于 HTTP 的登录认证**：通过调用后端 SpringBoot 接口，获取合法 Token 及用户信息。
2. **底层 WebSocket 建立与应用层握手**：依据 Token，发起对 Netty 服务器的连接，并发送符合规范的应用层建连数据包（`appId: 0`, `messageType: 0`）。
3. **聊天室交互逻辑**：进入聊天室、发送聊天消息及接收服务器推送广播。针对网络延迟和体验，加入了乐观更新（Optimistic Update）和针对发送方自身消息回显的防重过滤逻辑。

## 2. 核心模块详解

### 2.1 登录模块

- **组件位置**: `src/views/LoginView.vue`
- **状态管理**: `src/stores/user.ts`
- **交互逻辑**:
  1. 用户在页面提交账号密码。
  2. 调用 HTTP 接口 `POST /api/user/login` (实际代理至 `http://localhost:8080/user/login`)。
  3. **成功响应 (Code: 200)** 后，解析返回的 `data.token` 和 `data.user`。
  4. 将 Token 持久化存储（`localStorage`），并将用户对象存储于 Pinia Store 中。
  5. 登录状态就绪后，直接进入 **WebSocket 连接初始化阶段**。
  6. 跳转至大厅页面（`/lobby`）。

### 2.2 WebSocket 初始化与建连模块

- **核心代码**: `src/websocket/index.ts` 及 `src/stores/chat.ts`
- **Netty 连接配置**:
  - **地址**: `ws://localhost:9999/ws?token=<URI Encoded Token>`
  - 核心使用原生 `WebSocket` 实例维护连接生命周期。
- **交互逻辑与接口对齐**:
  1. **建立底层连接**: `LoginView` 调用 `chatStore.initWebSocket()`。
  2. **应用层建连 (至关重要)**: 当底层连接成功（触发 `onopen`）时，**立即**向 Netty 发送一条业务级的建连消息，以让后端缓存当前的 Channel 映射。
     - 发送格式 (`CompleteMessage`):
       ```json
       {
         "appId": 0,
         "uid": 12345,
         "token": "xxx...",
         "messageType": 0,
         "toId": 0,
         "content": "请求建立连接",
         "timeStamp": 1678886400000
       }
       ```
  3. **心跳保活**: 连接建立后，客户端定时（每 30 秒）发送一条心跳包（`appId: 0, messageType: 2, content: "ping"`），防止 Netty 将空闲连接断开。

### 2.3 聊天室消息收发模块

- **核心代码**: `src/stores/chat.ts`
- **交互逻辑**:
  1. **进入聊天室**: 调用 `setCurrentRoom` 时，主动发送 `appId: 1, messageType: 0` 的消息，并附带目标 `toId` 为当前的 `roomId`。
  2. **发送消息**:
     - **乐观更新体验**: 用户点击发送后，立刻在前端 `messages` 列表中插入一条 `status: 'sending'` 的本地临时消息，提高视觉响应速度。
     - **发送数据包**: 通过 WebSocket 向后端发送 JSON：
       ```json
       {
         "appId": 1,
         "uid": 12345,
         "token": "xxx...",
         "messageType": 1,
         "toId": <聊天室ID>,
         "content": "用户输入的文字",
         "timeStamp": 1678886400000
       }
       ```
  3. **接收消息**:
     - 在 `websocket/index.ts` 中拦截 `onmessage` 并分发至 `chatStore.handleIncomingChatMessage`。
     - **防重回显处理（Bug 修复机制）**: 虽然理论上 Netty 服务端不会将消息广播给发送方本身，但在前端实现中增加了一道保险：**比对推送消息中的 `uid` 与当前登录用户的 `userId`。如果一致，直接过滤丢弃。** 这彻底解决了前端用户看到两条一模一样自己消息的 Bug（一条来自乐观更新，一条来自服务端回显）。

## 3. 请求和代理细节说明 (Vite 代理)

- 前端在本地开发使用 Vite 运行于 `3000` 端口。
- `vite.config.ts` 已配置针对 HTTP 请求的 Proxy：请求 `/api/*` 时，实际会被代理至 SpringBoot 的 `http://localhost:8080/*`，从而有效绕过本地开发的 CORS（跨域）问题。
- WebSocket 连接（`ws://localhost:9999/ws`）则直接连接 Netty 服务，不存在传统 HTTP 跨域的限制。

## 4. 故障排查建议

基于当前的前端代码健壮性建设，如果在未来出现无法收发消息或者无法连接的问题，请按照以下步骤排查：
1. **控制台日志**: 前端针对 WebSocket 生命周期的每一步都加入了格式为 `====== [WebSocket] ====== ` 的显著日志，可以直接在浏览器的 `F12 - Console` 进行确认。
2. **全局对象注入**: 为便于开发调试，前端向 `window` 对象挂载了 `__webSocketService`。通过在控制台输入 `window.__webSocketService.ws.readyState` 可实时查询当前的 WebSocket 物理状态（`0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED`）。
3. **核实 Token 状态**: 所有的 WebSocket 消息体都强依赖正确的 `token` 与 `uid`，在前端如果发现相关报错，建议检查 `localStorage.getItem('auth_token')` 状态。

## 5. 结论

目前前端应用结构稳定，WebSocket 的 JSON 序列化格式与 Netty 接口规范（`CompleteMessage`）保持了高度一致，心跳机制、乐观更新体验机制均已正确落地，能够完美配合后端架构处理正常的即时通讯业务流。
