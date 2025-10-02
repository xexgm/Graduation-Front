import mitt from 'mitt'
import type { CompleteMessage } from '@/types'

// 定义事件类型，用于 mitt
export type WebSocketEvents = {
  'connected': void;
  'disconnected': CloseEvent;
  'error': Event;
  'message:received': CompleteMessage;
  'message:chat': CompleteMessage;
};

class WebSocketService {
  private ws: WebSocket | null = null
  private baseURL: string
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
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('WebSocket is already connected.')
        resolve()
        return
      }

      const url = `${this.baseURL}?token=${token}`
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log('WebSocket connection established.')
        this.reconnectAttempts = 0
        this.sendLogicalConnection(uid, token)
        this.startHeartbeat(uid, token)
        this.emitter.emit('connected')
        resolve()
      }

      this.ws.onmessage = (event) => {
        const message: CompleteMessage = JSON.parse(event.data)
        console.log('Received message:', message)
        this.emitter.emit('message:received', message)

        if (message.appId === 1 && message.messageType === 1) {
          this.emitter.emit('message:chat', message)
        }
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed.', event.reason)
        this.stopHeartbeat()
        this.emitter.emit('disconnected', event)
        this.reconnect(token, uid)
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
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
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected. Message not sent.')
    }
  }

  // 建立逻辑连接 (appId: 0, messageType: 0)
  private sendLogicalConnection(uid: number, token: string): void {
    this.send({
      appId: 0,
      messageType: 0,
      uid,
      token,
      timeStamp: Date.now(),
      content: null
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
      content: null
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

  // 退出聊天室 (appId: 1, messageType: 2)
  public exitChatRoom(uid: number, token: string, roomId: number): void {
    this.send({
      appId: 1,
      messageType: 2,
      uid,
      token,
      toId: roomId,
      timeStamp: Date.now(),
      content: null
    })
  }

  public disconnect(): void {
    this.stopHeartbeat()
    if (this.ws) {
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

// 创建并导出一个单例
const wsURL = import.meta.env.VITE_WS_URL || 'ws://localhost:9999/ws'
export const webSocketService = new WebSocketService(wsURL)
