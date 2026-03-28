# 快速开始 (Quickstart)

这部分展示了本次变更后，如何在客户端发起合规的 WebSocket 报文。这些代码将通过修改 `src/websocket/index.ts` 来实现。

## 1. 建立与服务端的逻辑连接
```typescript
private sendLogicalConnection(uid: number, token: string): void {
  this.send({
    appId: 0,
    messageType: 0,
    uid,
    token,
    toId: 0,       // [新增] 必须包含接收方ID
    content: "",   // [修改] null 必须替换为空字符串
    timeStamp: Date.now()
  })
}
```

## 2. 维持心跳保活
```typescript
private startHeartbeat(uid: number, token: string): void {
  this.heartbeatTimer = window.setInterval(() => {
    this.send({
      appId: 0,
      messageType: 2,
      uid,
      token,
      toId: 0,       // [新增] 必须包含接收方ID
      content: "ping",
      timeStamp: Date.now()
    })
  }, 30000) // 每30秒发送一次心跳
}
```

## 3. 安全断开连接 (主动通知服务端)
```typescript
public disconnect(uid: number, token: string): void {
  this.stopHeartbeat()
  
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    // [新增] 发送安全断开包
    this.send({
      appId: 0,
      messageType: 1,
      uid,
      token,
      toId: 0,
      content: "",
      timeStamp: Date.now()
    })
    
    // 然后关闭物理连接
    this.ws.close()
  }
}
```