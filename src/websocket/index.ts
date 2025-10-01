import mitt from 'mitt'
import type { WebSocketMessage } from '@/types'

export type Events = {
  'message:received': WebSocketMessage
  'user:online': { userId: string }
  'user:offline': { userId: string }
  'typing:start': { userId: string, roomId: string }
  'typing:stop': { userId: string, roomId: string }
  'connection:lost': void
  'connection:restored': void
}

class WebSocketManager {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000
  private heartbeatInterval: number | null = null
  private emitter = mitt<Events>()
  private isConnecting = false

  constructor(url: string) {
    this.url = url
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
        return
      }

      this.isConnecting = true
      const wsUrl = token ? `${this.url}?token=${token}` : this.url
      
      try {
        this.ws = new WebSocket(wsUrl)
        
        this.ws.onopen = () => {
          console.log('WebSocket连接已建立')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('解析WebSocket消息失败:', error)
          }
        }

        this.ws.onclose = () => {
          console.log('WebSocket连接已关闭')
          this.isConnecting = false
          this.stopHeartbeat()
          this.emitter.emit('connection:lost')
          this.handleReconnect()
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket连接错误:', error)
          this.isConnecting = false
          reject(error)
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'message':
        this.emitter.emit('message:received', message)
        break
      case 'user_join':
        this.emitter.emit('user:online', { userId: message.data.userId })
        break
      case 'user_leave':
        this.emitter.emit('user:offline', { userId: message.data.userId })
        break
      case 'typing':
        if (message.data.isTyping) {
          this.emitter.emit('typing:start', { 
            userId: message.data.userId, 
            roomId: message.data.roomId 
          })
        } else {
          this.emitter.emit('typing:stop', { 
            userId: message.data.userId, 
            roomId: message.data.roomId 
          })
        }
        break
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`尝试重新连接... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connect()
      }, this.reconnectInterval * this.reconnectAttempts)
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'heartbeat',
          data: {},
          timestamp: new Date()
        })
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket未连接，消息发送失败')
    }
  }

  disconnect() {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void) {
    this.emitter.on(event, handler)
  }

  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void) {
    this.emitter.off(event, handler)
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export default WebSocketManager