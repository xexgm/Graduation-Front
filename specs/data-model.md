# Phase 1: Data Model Design

This document defines the TypeScript interfaces required to implement the Friend and Private Chat features. These should be appended to `src/types/index.ts`.

## 1. Friend Management Entities

```typescript
/**
 * Represents a user in the friend list.
 * Based on the backend `FriendResponse`.
 */
export interface Friend {
  userId: number;
  username: string;
  nickname: string;
  avatarUrl?: string;
  signature?: string;
  status: number;         // 0=Offline, 1=Online
  relationStatus: number; // 0=Normal, 1=Blocked
}

/**
 * Response structure for the friend list API.
 */
export interface FriendListResponse {
  code: number;
  message: string;
  data: Friend[];
}
```

## 2. Private Message Entities

```typescript
/**
 * Represents a single private message in history.
 * Based on the backend `PrivateMessage`.
 */
export interface PrivateMessageHistory {
  msgId: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: number;      // 0=Unread, 1=Read
  createTime: string;  // ISO 8601 string or format "YYYY-MM-DD HH:mm:ss"
}

/**
 * Paginated response structure for private chat history.
 */
export interface PrivateMessageHistoryResponse {
  code: number;
  message: string;
  data: {
    records: PrivateMessageHistory[];
    total: number;
    size: number;
    current: number;
    pages: number;
  }
}
```

## 3. Store State Model (Pinia)

To properly manage the friend states and their conversations:

```typescript
// Proposed internal state structure for `useFriendStore`
interface FriendState {
  friends: Friend[];
  
  // Maps a friendId to an array of messages
  // This unifies WebSocket real-time messages and historical messages
  privateMessages: Record<number, Message[]>; 
  
  // Maps a friendId to their current unread count
  unreadCounts: Record<number, number>;
  
  // The ID of the friend currently being chatted with (if any)
  activeFriendId: number | null;
}
```
