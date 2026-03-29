# Phase 0: Research & Technical Decisions

## 1. Local Storage Strategy for Chat History

**Unknown:** Should private messages be cached locally (e.g., IndexedDB) to improve load performance, or strictly fetched from the server via `/message/private/history` upon opening a chat session?

- **Decision:** **Strictly fetch from the server** during the initial phase.
- **Rationale:** The backend has provided a mature `/message/private/history` API with pagination (`current`, `size`). For MVP and initial rollout, prioritizing data consistency directly from the source is safer and easier to maintain. 
- **Alternatives considered:** Implementing a complex sync layer with IndexedDB for offline-first support. Dismissed because it adds too much complexity for this stage.

## 2. Friend Request Flow

**Unknown:** Does `/friend/add` automatically establish a relationship, or is there a pending/accept workflow?

- **Decision:** **Automatic / One-sided Direct Add**.
- **Rationale:** According to `FRONTEND_API_DOCS.md`, the `/friend/add` endpoint takes `friendId` and responds with "添加成功", lacking any mention of "Request Sent" or "Pending Status". We will build the UI assuming the relationship is immediately established upon a successful 200 OK response.
- **Alternatives considered:** Waiting for WebSocket push events to approve/reject. Dismissed because the API doc does not define such lifecycle states for relationships yet.

## 3. Unread Message Notification System

**Unknown:** When receiving a private message while in another view, how should the application structure the unread badge counter for the specific user?

- **Decision:** Store an `unreadCount` mapped to each `friendId` within a centralized state store (`useFriendStore`).
- **Rationale:** Pinia allows global state distribution. When `WebSocketService` receives `appId: 2`, it fires an event. The store increments `unreadCount` for the sender's `friendId` if the current active view is not that specific friend's chat window.
- **Alternatives considered:** Component-level state tracking. Dismissed because if the user navigates away from the FriendList component, the unread count would be lost. Centralizing it in Pinia is required.
