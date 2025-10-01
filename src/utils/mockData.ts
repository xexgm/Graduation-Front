import type { User, ChatRoom, Message } from '@/types'

export const Users: User[] = [
  {
    userId: 1,
    username: 'alice',
    nickname: '爱丽丝',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    status: 1,
    createTime: Date.now(),
    updateTime: Date.now()
  },
  {
    userId: 2, 
    username: 'bob',
    nickname: '鲍勃',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    status: 1,
    createTime: Date.now(),
    updateTime: Date.now()
  },
  {
    userId: 3,
    username: 'charlie',
    nickname: '查理',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
    status: 0,
    createTime: Date.now() - 10 * 60 * 1000,
    updateTime: Date.now() - 10 * 60 * 1000
  }
]

export const Rooms: ChatRoom[] = [
  {
    id: 'room1',
    name: '',
    type: 'private',
    participants: [Users[0], Users[1]],
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
    participants: [Users[0], Users[1], Users[2]],
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

export const Messages: Record<string, Message[]> = {
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