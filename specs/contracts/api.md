# API Contracts (Current)

本文档记录当前前端 `src/api/index.ts` 与 `src/websocket/index.ts` 的实际接口契约（已落地版本）。

## 1. HTTP API Methods (Axios)

### 1.1 `friendApi`

```typescript
export const friendApi = {
  // 添加好友（POST Body）
  addFriend: (friendId: number, userId: number): Promise<ApiResponse<null>> =>
    api.post('/friend/add', { userId, friendId }).then(res => res.data),

  // 删除好友
  removeFriend: (friendId: number, userId: number): Promise<ApiResponse<null>> =>
    api.delete(`/friend/remove/${friendId}?userId=${userId}`).then(res => res.data),

  // 获取好友列表
  getFriendList: (userId: number): Promise<ApiResponse<Friend[]>> =>
    api.get(`/friend/list?userId=${userId}`).then(res => res.data)
}
```

### 1.2 `messageApi`

```typescript
export const messageApi = {
  // 获取私聊历史记录（含 friendId 合法性校验）
  getPrivateHistory: (
    userId: number,
    friendId: number,
    current = 1,
    size = 20
  ): Promise<ApiResponse<PrivateMessageHistoryResponse['data']>> => {
    const normalizedFriendId = Number(friendId)
    if (!Number.isFinite(normalizedFriendId) || normalizedFriendId <= 0) {
      return Promise.reject(new Error('friendId is invalid when fetching private history'))
    }
    return api
      .get(`/message/private/history?userId=${userId}&friendId=${normalizedFriendId}&current=${current}&size=${size}`)
      .then(res => res.data)
  },

  // 获取群聊历史记录
  getChatRoomHistory: (roomId: number, current = 1, size = 20): Promise<ApiResponse<any>> =>
    api.get(`/message/chatroom/history?roomId=${roomId}&current=${current}&size=${size}`).then(res => res.data)
}
```

### 1.3 `chatApi`

```typescript
export const chatApi = {
  listChatRooms: (): Promise<ApiResponse<BackendChatRoom[]>> =>
    api.get('/chatroom/list').then(res => res.data),

  createChatRoom: (data: CreateChatRoomRequest): Promise<ApiResponse<BackendChatRoom>> =>
    api.post('/chatroom/create', data).then(res => res.data),

  offlineChatRoom: (roomId: number): Promise<ApiResponse<null>> =>
    api.post(`/chatroom/${roomId}/offline`).then(res => res.data),

  deleteChatRoom: (roomId: number): Promise<ApiResponse<null>> =>
    api.delete(`/chatroom/${roomId}`).then(res => res.data),

  getRoomOnlineCount: (roomId: number): Promise<ApiResponse<number>> =>
    api.get(`/chatroom/${roomId}/count`).then(res => res.data)
}
```

## 2. WebSocket Contract (Netty)

### 2.1 Event Bus

```typescript
export type WebSocketEvents = {
  'connected': void;
  'disconnected': CloseEvent;
  'error': Event;
  'message:received': CompleteMessage;
  'message:chat': CompleteMessage;    // appId:1,messageType:1
  'message:private': CompleteMessage; // appId:2,messageType:1
};
```

### 2.2 Send Methods

```typescript
// 聊天室消息
sendChatMessage(uid, token, roomId, content) => {
  appId: 1, messageType: 1, toId: roomId
}

// 私聊消息
sendPrivateMessage(uid, token, friendId, content) => {
  appId: 2, messageType: 1, toId: friendId
}
```

### 2.3 Receive Dispatch

```typescript
this.ws.onmessage = (event) => {
  const message: CompleteMessage = JSON.parse(event.data)
  this.emitter.emit('message:received', message)

  if (message.appId === 1 && message.messageType === 1) {
    this.emitter.emit('message:chat', message)
  }
  if (message.appId === 2 && message.messageType === 1) {
    this.emitter.emit('message:private', message)
  }
}
```
