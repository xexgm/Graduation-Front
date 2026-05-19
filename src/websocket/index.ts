import mitt from 'mitt'
import type { CompleteMessage } from '@/types'

// 定义事件类型，用于 mitt
export type WebSocketEvents = {
  'connected': void;
  'disconnected': CloseEvent;
  'error': Event;
  'message:received': CompleteMessage;
  'message:chat': CompleteMessage;
  'message:private': CompleteMessage;
  'message:private-server-ack': CompleteMessage;
  'message:private-delivered-ack': CompleteMessage;
  'message:private-read-ack': CompleteMessage;
  'notification:friend-request': CompleteMessage;
  'notification:friend-accepted': CompleteMessage;
  'notification:friend-rejected': CompleteMessage;
};

class WebSocketService {
  private ws: WebSocket | null = null
  private baseURL: string
  private token: string = ''
  private uid: number = 0
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000
  private heartbeatTimer: number | null = null

  // 使用 mitt 实现事件发布/订阅
  private emitter = mitt<WebSocketEvents>()

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  public connect(token: string, uid: number): Promise<void> {
    this.token = token
    this.uid = uid
    return new Promise((resolve, reject) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        console.log('====== [WebSocket] 已经连接或正在连接，跳过实例化 ======')
        resolve()
        return
      }

      const url = `${this.baseURL}?token=${encodeURIComponent(token)}`
      console.log('====== [WebSocket] 准备实例化 WebSocket ======')
      console.log('====== [WebSocket] 用户ID (UID):', uid)
      console.log('====== [WebSocket] 连接地址 URL:', url)
      
      try {
        this.ws = new WebSocket(url)
        console.log('====== [WebSocket] new WebSocket() 实例化执行完毕，等待 onopen 回调 ======')
      } catch (err) {
        console.error('====== [WebSocket] 实例化失败，可能是 URL 格式错误 ======:', err)
        reject(err)
        return
      }

      this.ws.onopen = (event) => {
        console.log('====== [WebSocket] 物理连接已建立 (onopen 触发) ======', event)
        console.log('====== [WebSocket] 立即发送 messageType=0 的逻辑建连消息 ======')
        this.reconnectAttempts = 0
        this.sendLogicalConnection(uid, token)
        this.startHeartbeat(uid, token)
        this.emitter.emit('connected')
        resolve()
      }

      this.ws.onmessage = (event) => {
        const message: CompleteMessage = JSON.parse(event.data)
        console.log('====== [WebSocket] 收到服务器消息 (onmessage) ======', message)
        this.emitter.emit('message:received', message)

        if (message.appId === 1 && (message.messageType === 1 || message.messageType === 3 || message.messageType === 4)) {
          this.emitter.emit('message:chat', message)
        }

        if (message.appId === 2 && (message.messageType === 1 || message.messageType === 2 || message.messageType === 3)) {
          this.emitter.emit('message:private', message)
        }

        if (message.appId === 2 && message.messageType === 4) {
          this.emitter.emit('notification:friend-request', message)
        }

        if (message.appId === 2 && message.messageType === 5) {
          this.emitter.emit('notification:friend-accepted', message)
        }

        if (message.appId === 2 && message.messageType === 6) {
          this.emitter.emit('notification:friend-rejected', message)
        }

        if (message.appId === 2 && message.messageType === 7) {
          this.emitter.emit('message:private-server-ack', message)
        }

        if (message.appId === 2 && message.messageType === 8) {
          this.emitter.emit('message:private-delivered-ack', message)
        }

        if (message.appId === 2 && message.messageType === 9) {
          this.emitter.emit('message:private-read-ack', message)
        }
      }

      this.ws.onclose = (event) => {
        console.warn('====== [WebSocket] 连接断开 (onclose 触发) ======', 'code:', event.code, 'reason:', event.reason)
        this.stopHeartbeat()
        this.emitter.emit('disconnected', event)
        this.reconnect(token, uid)
      }

      this.ws.onerror = (error) => {
        console.error('====== [WebSocket] 连接发生错误 (onerror 触发) ======', error)
        this.emitter.emit('error', error as Event)
        reject(error)
      }
    })
  }

  private reconnect(token: string, uid: number): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      setTimeout(() => {
        this.connect(token, uid)
      }, this.reconnectInterval)
    } else {
      console.error('Max reconnect attempts reached.')
    }
  }

  private send(message: Omit<CompleteMessage, 'compression' | 'encryption'>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message)
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected. Message not sent.', message)
    }
  }

  // 建立逻辑连接 (appId: 0, messageType: 0)
  private sendLogicalConnection(uid: number, token: string): void {
    this.send({
      appId: 0,
      messageType: 0,
      uid,
      token,
      toId: 0,
      timeStamp: Date.now(),
      content: "请求建立连接"
    })
  }

  // 心跳 (appId: 0, messageType: 2)
  private startHeartbeat(uid: number, token: string): void {
    this.heartbeatTimer = window.setInterval(() => {
      this.send({
        appId: 0,
        messageType: 2,
        uid,
        token,
        toId: 0,
        content: 'ping',
        timeStamp: Date.now()
      })
    }, 30000) // 每30秒发送一次心跳
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // 进入聊天室 (appId: 1, messageType: 0)
  public enterChatRoom(uid: number, token: string, roomId: number): void {
    this.send({
      appId: 1,
      messageType: 0,
      uid,
      token,
      toId: roomId,
      timeStamp: Date.now(),
      content: ""
    })
  }

  // 发送聊天室消息 (appId: 1, messageType: 1)
  public sendChatMessage(uid: number, token: string, roomId: number, content: string): void {
    this.send({
      appId: 1,
      messageType: 1,
      uid,
      token,
      toId: roomId,
      content,
      timeStamp: Date.now()
    })
  }

  // 发送聊天室文件消息 (appId: 1, messageType: 3)
  public sendChatFileMessage(uid: number, token: string, roomId: number, content: string): void {
    this.send({
      appId: 1,
      messageType: 3,
      uid,
      token,
      toId: roomId,
      content,
      timeStamp: Date.now()
    })
  }

  // 发送聊天室语音消息 (appId: 1, messageType: 4)
  public sendChatAudioMessage(uid: number, token: string, roomId: number, content: string): void {
    this.send({
      appId: 1,
      messageType: 4,
      uid,
      token,
      toId: roomId,
      content,
      timeStamp: Date.now()
    })
  }

  // 退出聊天室 (appId: 1, messageType: 2)
  public exitChatRoom(uid: number, token: string, roomId: number): void {
    this.send({
      appId: 1,
      messageType: 2,
      uid,
      token,
      toId: roomId,
      timeStamp: Date.now(),
      content: ""
    })
  }

  // 发送私聊消息 (appId: 2, messageType: 1)
  public sendPrivateMessage(uid: number, token: string, friendId: number, content: string): void {
    this.send({
      appId: 2,
      messageType: 1,
      uid,
      token,
      toId: friendId,
      content,
      timeStamp: Date.now()
    })
  }

  public sendPrivateMessageWithClientId(
    uid: number,
    token: string,
    friendId: number,
    content: string,
    messageType = 1,
    clientMsgId?: string
  ): void {
    this.send({
      appId: 2,
      messageType,
      uid,
      token,
      toId: friendId,
      content,
      clientMsgId,
      timeStamp: Date.now()
    })
  }

  // 发送私聊文件消息 (appId: 2, messageType: 2)
  public sendPrivateFileMessage(uid: number, token: string, friendId: number, content: string): void {
    this.send({
      appId: 2,
      messageType: 2,
      uid,
      token,
      toId: friendId,
      content,
      timeStamp: Date.now()
    })
  }

  // 发送私聊语音消息 (appId: 2, messageType: 3)
  public sendPrivateAudioMessage(uid: number, token: string, friendId: number, content: string): void {
    this.send({
      appId: 2,
      messageType: 3,
      uid,
      token,
      toId: friendId,
      content,
      timeStamp: Date.now()
    })
  }

  public sendPrivateDeliveredAck(uid: number, token: string, senderId: number, msgId: number): void {
    this.send({
      appId: 2,
      messageType: 8,
      uid,
      token,
      toId: senderId,
      msgId,
      content: JSON.stringify({ status: 'DELIVERED' }),
      timeStamp: Date.now()
    })
  }

  public sendPrivateReadAck(uid: number, token: string, friendId: number, maxMsgId: number): void {
    this.send({
      appId: 2,
      messageType: 9,
      uid,
      token,
      toId: friendId,
      content: JSON.stringify({ maxMsgId }),
      timeStamp: Date.now()
    })
  }

  public disconnect(): void {
    this.stopHeartbeat()
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // 在关闭物理连接前，主动发送注销连接的包
      this.send({
        appId: 0,
        messageType: 1,
        uid: this.uid,
        token: this.token,
        toId: 0,
        content: '请求断开连接',
        timeStamp: Date.now()
      })
      this.ws.close()
    }
  }

  // 订阅事件
  public on<Key extends keyof WebSocketEvents>(event: Key, listener: (arg: WebSocketEvents[Key]) => void) {
    this.emitter.on(event, listener)
  }

  // 取消订阅
  public off<Key extends keyof WebSocketEvents>(event: Key, listener: (arg: WebSocketEvents[Key]) => void) {
    this.emitter.off(event, listener)
  }
}

// 创建并导出一个单例，协议由 VITE_WS_URL 中的 ws:// 或 wss:// 决定。
const wsURL = import.meta.env.VITE_WS_URL || 'ws://localhost:9999/ws'
export const webSocketService = new WebSocketService(wsURL)

// 暴露到全局供开发模式下排查问题
if (typeof window !== 'undefined') {
  ;(window as any).__webSocketService = webSocketService
  console.log('====== [WebSocket] 服务已挂载至全局 window.__webSocketService ======')
}
