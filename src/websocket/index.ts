import mitt from 'mitt'
import type { CompleteMessage } from '@/types'

export type Events = {
  'connected': void
  'disconnected': CloseEvent
  'error': Event
  'message:received': CompleteMessage
  'chat:message': CompleteMessage
  'room:joined': CompleteMessage
  'room:left': CompleteMessage
  'connection:established': CompleteMessage
  'heartbeat:response': CompleteMessage
}

class WebSocketManager {
  private ws: WebSocket | null = null
  private url: string
  private token: string = ''
  private userId: number = 0
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000
  private heartbeatInterval: number | null = null
  private emitter = mitt<Events>()
  private isConnecting = false

  constructor(url?: string) {
    this.url = url || import.meta.env.VITE_WS_URL || 'ws://localhost:9999/ws'
  }

  // 连接WebSocket
  connect(token: string, userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
        return
      }

      this.isConnecting = true
      this.token = token
      this.userId = userId
      
      try {
        this.ws = new WebSocket(this.url)
        
        this.ws.onopen = () => {
          console.log('WebSocket连接已建立')
          this.isConnecting = false
          this.reconnectAttempts = 0
          
          // 发送建连消息
          this.sendConnectMessage()
          
          // 启动心跳
          this.startHeartbeat()
          
          this.emitter.emit('connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: CompleteMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('解析WebSocket消息失败:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket连接已关闭', event.code, event.reason)
          this.isConnecting = false
          this.stopHeartbeat()
          this.emitter.emit('disconnected', event)
          
          // 自动重连
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++
              console.log(`尝试重新连接... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
              this.connect(this.token, this.userId)
            }, this.reconnectInterval * this.reconnectAttempts)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket连接错误:', error)
          this.isConnecting = false
          this.emitter.emit('error', error)
          reject(error)
        }

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  // 处理收到的消息
  private handleMessage(message: CompleteMessage) {
    console.log('收到WebSocket消息:', message)

    if (message.appId === 1) {
      // 连接管理消息
      if (message.messageType === 0) {
        // 连接建立成功
        this.emitter.emit('connection:established', message)
      } else if (message.messageType === 2) {
        // 心跳响应
        this.emitter.emit('heartbeat:response', message)
      }
    } else if (message.appId === 2) {
      // 聊天室消息
      if (message.messageType === 0) {
        // 进入聊天室
        this.emitter.emit('room:joined', message)
      } else if (message.messageType === 1) {
        // 聊天消息
        this.emitter.emit('chat:message', message)
      } else if (message.messageType === 2) {
        // 退出聊天室
        this.emitter.emit('room:left', message)
      }
    }

    // 触发通用消息事件
    this.emitter.emit('message:received', message)
  }

  // 发送消息
  private send(message: CompleteMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket未连接，消息发送失败')
    }
  }

  // 发送建连消息 (appId=1, messageType=0)
  private sendConnectMessage() {
    this.send({
      appId: 1,
      uid: this.userId,
      token: this.token,
      messageType: 0,
      toId: 0,
      content: '',
      timeStamp: Date.now()
    })
  }

  // 发送断连消息 (appId=1, messageType=1)
  private sendDisconnectMessage() {
    this.send({
      appId: 1,
      uid: this.userId,
      token: this.token,
      messageType: 1,
      toId: 0,
      content: '',
      timeStamp: Date.now()
    })
  }

  // 发送心跳消息 (appId=1, messageType=2)
  private sendHeartbeat() {
    this.send({
      appId: 1,
      uid: this.userId,
      token: this.token,
      messageType: 2,
      toId: 0,
      content: 'ping',
      timeStamp: Date.now()
    })
  }

  // 启动心跳
  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat()
    }, 30000) // 30秒心跳
  }

  // 停止心跳
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // 聊天室操作

  // 进入聊天室 (appId=2, messageType=0)
  joinChatRoom(roomId: number) {
    this.send({
      appId: 2,
      uid: this.userId,
      token: this.token,
      messageType: 0,
      toId: roomId,
      content: '',
      timeStamp: Date.now()
    })
  }

  // 发送聊天室消息 (appId=2, messageType=1)
  sendChatMessage(roomId: number, content: string) {
    this.send({
      appId: 2,
      uid: this.userId,
      token: this.token,
      messageType: 1,
      toId: roomId,
      content,
      timeStamp: Date.now()
    })
  }

  // 退出聊天室 (appId=2, messageType=2)
  leaveChatRoom(roomId: number) {
    this.send({
      appId: 2,
      uid: this.userId,
      token: this.token,
      messageType: 2,
      toId: roomId,
      content: '',
      timeStamp: Date.now()
    })
  }

  // 断开连接
  disconnect() {
    this.stopHeartbeat()
    if (this.ws) {
      // 发送断连消息
      this.sendDisconnectMessage()
      
      // 延迟关闭，确保断连消息发送成功
      setTimeout(() => {
        if (this.ws) {
          this.ws.close()
          this.ws = null
        }
      }, 100)
    }
  }

  // 事件监听
  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void) {
    this.emitter.on(event, handler)
  }

  // 移除事件监听
  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void) {
    this.emitter.off(event, handler)
  }

  // 获取连接状态
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  // 获取用户ID
  get currentUserId(): number {
    return this.userId
  }
}

export default WebSocketManager