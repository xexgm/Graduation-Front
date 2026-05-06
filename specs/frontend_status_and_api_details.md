# 前端项目架构与接口现状总结（2026-03-29）

本文档用于记录当前前端代码的真实状态（已落地功能、架构形态、接口实现、已知风险），作为后续 UI 重构与联调的基线。

## 1. 当前整体状态

当前项目已从“大厅页 + 聊天页”双页面结构，演进为统一工作台模式（Workspace）并保持与后端 SpringBoot + Netty 的联通。

已稳定可用能力：

1. 登录鉴权、Token 持久化、路由守卫。
2. WebSocket 建连、心跳、断开、自动重连基础能力。
3. 聊天室实时收发（`appId=1`）+ 乐观更新 + 自身回显过滤。
4. 私聊实时收发（`appId=2`）+ 私聊历史拉取 + 未读计数。
5. HTTP 文件上传/下载 + WebSocket 文件消息分发。
6. 语音录制、上传、WebSocket 分发与点击播放。
7. 好友列表轮询（5s）+ 添加/删除好友。
8. Workspace 左侧模块导航（会话/好友/聊天室）与右侧统一会话面板联动。

---

## 2. UI 与交互架构现状

## 2.1 统一工作台（Workspace）

- 入口页面：`src/views/WorkspaceView.vue`
- 页面布局：三栏结构
  - 左栏：一级导航（会话/好友/聊天室）
  - 中栏：按模块切换显示（会话列表/好友模块/聊天室模块）
  - 右栏：统一会话面板（私聊或聊天室消息区）

## 2.2 一级导航

- 组件：`src/components/workspace/PrimaryNav.vue`
- 现状：
  - `conversation`、`friend`、`room` 可点击切换。
  - `setting` 仍为预留占位（未接行为）。

## 2.3 中栏模块

- 会话列表：`src/components/workspace/ConversationListPane.vue`
  - 支持会话搜索、刷新、未读显示、点击打开会话。
- 好友模块：`src/components/workspace/FriendModulePane.vue`
  - 支持查看好友、添加好友、点击好友打开私聊。
- 聊天室模块：`src/components/workspace/RoomModulePane.vue`
  - 支持查看聊天室列表、创建聊天室、进入聊天室会话。

## 2.4 右栏会话面板

- 组件：`src/components/workspace/ConversationPanel.vue`
- 根据当前会话类型渲染：
  - 私聊：`src/components/friend/PrivateChatWindow.vue`
  - 聊天室：`src/components/ChatHeader.vue` + `src/components/MessageList.vue` + `src/components/MessageInput.vue`

---

## 3. 状态管理现状

## 3.1 会话聚合层

- `src/stores/conversation.ts`
- 作用：
  - 聚合 `friendStore` 与 `chatStore` 形成统一 `Conversation[]`。
  - 提供 `openConversation`、`openPrivateByFriendId`、`openRoomByRoomId`。
  - 统一维护 `activeConversationKey`。

## 3.2 好友与私聊层

- `src/stores/friend.ts`
- 关键能力：
  - `fetchFriends`、`addFriend`、`removeFriend`
  - `fetchPrivateHistory`（含 `friendId` 合法性校验，防止 `undefined`）
  - `openPrivateChat`（切会话 + 清未读 + 拉历史）
  - `initFriendWebSocket` 监听 `message:private`
  - `startFriendPolling(5000)` / `stopFriendPolling`

## 3.3 聊天室层

- `src/stores/chat.ts`
- 关键能力：
  - `fetchRooms`、`createRoom`、`deleteRoom`、`offlineRoom`
  - `setCurrentRoom`（进房/退房 + 在线人数轮询）
  - `sendMessage`（乐观更新）
  - `handleIncomingChatMessage`（过滤自身回显）

---

## 4. 接口实现现状（HTTP）

接口封装文件：`src/api/index.ts`

## 4.1 鉴权与拦截器

- 请求头自动附加 `Authorization: Bearer <token>`。
- Token 来源优先级：运行时内存变量 > `sessionStorage` > `localStorage`。
- 401 会清理 token 并跳回登录页。

## 4.2 用户接口

- 登录/注册/登出/校验 token/获取用户/修改密码均已封装。

## 4.3 好友接口

- 添加好友：`POST /friend/add`（**JSON Body**：`{ userId, friendId }`）
- 删除好友：`DELETE /friend/remove/{friendId}?userId={userId}`
- 好友列表：`GET /friend/list?userId={userId}`

> 说明：添加好友曾出现 query/body 口径差异，当前代码已按“POST 请求体”实现。

## 4.4 消息历史接口

- 私聊历史：`GET /message/private/history?userId={uid}&friendId={friendId}&current=1&size=20`
- 聊天室历史：`GET /message/chatroom/history?roomId={roomId}&current=1&size=20`
- 已增加参数防御，避免出现 `friendId=undefined`。

## 4.5 聊天室管理接口

- 列表：`GET /chatroom/list`
- 创建：`POST /chatroom/create`
- 下线：`POST /chatroom/{roomId}/offline`
- 删除：`DELETE /chatroom/{roomId}`
- 在线人数：`GET /chatroom/{roomId}/count`

## 4.6 文件传输接口

- 上传文件：`POST /file/upload`，`multipart/form-data` 字段名为 `file`
- 下载文件：`GET /file/download/{fileId}`，以 Blob 方式下载并在前端触发保存
- 文件和语音上传后，前端通过 WebSocket 发送元数据 JSON，文件/音频本体不走 WebSocket

---

## 5. WebSocket 与协议现状（Netty）

WebSocket 核心文件：`src/websocket/index.ts`

- 连接地址由环境变量 `VITE_WS_URL` 控制，默认回退到 `ws://localhost:9999/ws`
- 普通 WS：`ws://localhost:9999/ws?token=<token>`
- 开启 WSS：`wss://localhost:9999/ws?token=<token>`
- 本地 WSS 使用自签证书时，需要先在浏览器信任 `localhost:9999` 的证书
- 消息模型：`CompleteMessage`
- 关键业务线：
  - `appId=0`：建连/断连/心跳
  - `appId=1`：聊天室进入/文本发送/退出/文件发送（`messageType=3`）/语音发送（`messageType=4`）
  - `appId=2`：私聊文本发送与接收/文件发送与接收（`messageType=2`）/语音发送与接收（`messageType=3`）
- 事件分发：
  - `message:chat` -> 聊天室 store
  - `message:private` -> 好友 store

---

## 6. 路由现状

路由文件：`src/router/index.ts`

- 新增统一工作台：`/workspace`
- 当前 `/lobby` 与 `/chat` 已映射到 `WorkspaceView`（兼容旧入口）
- 结果：用户进入任一聊天主入口，都会落在同一套 UI 工作台

---

## 7. 已知问题与后续优化建议

1. `specs/contracts/api.md` 与代码在个别接口口径上可能有历史差异（尤其 `/friend/add`），需持续保持文档同步。  
2. 中栏模块已支持好友与聊天室，但“设置”模块仍是占位，后续可接入 `SettingsView`。  
3. 会话聚合目前按“最近消息时间”排序，后续可扩展置顶、草稿、免打扰等策略。  
4. 好友轮询为固定 5 秒，后续可做“页面可见性感知 + 自适应降频”优化。  

---

## 8. 结论

当前前端已具备“统一工作台 + 私聊 + 聊天室 + 好友管理”的完整主链路，核心接口与实时通信链路可用，且关键历史 bug（`friendId=undefined`、导航不可点击、添加/创建入口缺失）已修复。  
整体已进入“稳定迭代 + 体验细化”阶段，可继续推进模块扩展与交互优化。
