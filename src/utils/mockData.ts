import type { User, ChatRoom, Message } from '@/types'

export const mockUsers: User[] = [
  {
    id: '1',
    username: 'alice',
    nickname: '爱丽丝',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    email: 'alice@example.com',
    status: 'online',
    lastSeen: new Date()
  },
  {
    id: '2', 
    username: 'bob',
    nickname: '鲍勃',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    email: 'bob@example.com',
    status: 'online',
    lastSeen: new Date()
  },
  {
    id: '3',
    username: 'charlie',
    nickname: '查理',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
    email: 'charlie@example.com',
    status: 'away',
    lastSeen: new Date(Date.now() - 10 * 60 * 1000)
  }
]

export const mockRooms: ChatRoom[] = [
  {
    id: 'room1',
    name: '',
    type: 'private',
    participants: [mockUsers[0], mockUsers[1]],
    lastMessage: {
      id: 'msg1',
      senderId: '1',
      receiverId: '2',
      roomId: 'room1',
      content: '你好，最近怎么样？',
      type: 'text',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'read'
    },
    unreadCount: 0,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: 'room2',
    name: '开发团队',
    type: 'group',
    participants: [mockUsers[0], mockUsers[1], mockUsers[2]],
    lastMessage: {
      id: 'msg2',
      senderId: '2',
      roomId: 'room2',
      content: '今天的会议改到下午3点',
      type: 'text',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'delivered'
    },
    unreadCount: 2,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=DevTeam',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000)
  }
]

export const mockMessages: Record<string, Message[]> = {
  room1: [
    {
      id: 'msg1',
      senderId: '1',
      receiverId: '2',
      roomId: 'room1',
      content: '你好，最近怎么样？',
      type: 'text',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'read'
    },
    {
      id: 'msg2',
      senderId: '2',
      receiverId: '1',
      roomId: 'room1',
      content: '挺好的，你呢？刚完成了一个新项目',
      type: 'text',
      timestamp: new Date(Date.now() - 3 * 60 * 1000),
      status: 'read'
    }
  ],
  room2: [
    {
      id: 'msg3',
      senderId: '2',
      roomId: 'room2',
      content: '今天的会议改到下午3点',
      type: 'text',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'delivered'
    },
    {
      id: 'msg4',
      senderId: '3',
      roomId: 'room2',
      content: '收到，我会准时参加',
      type: 'text',
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      status: 'sent'
    }
  ]
}