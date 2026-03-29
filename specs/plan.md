# User Private Chat and Friend Management - Implementation Plan

## 1. Technical Context

This feature implements one-to-one private chatting and friend management within the existing Vue 3 + TypeScript application, complementing the currently established group chatroom system.

### Dependencies & Tech Stack
- Vue 3 (Composition API) & Pinia for state management.
- Element Plus for UI components.
- Axios for HTTP API interactions (SpringBoot backend).
- Native WebSocket for real-time messaging (Netty backend).

### Knowns
- **Backend APIs for friends**: `/friend/add`, `/friend/remove/{friendId}`, `/friend/list` are available.
- **Backend APIs for message history**: `/message/private/history` and `/message/chatroom/history` are available.
- **Netty Protocol**: Defined using `CompleteMessage` interface. Private chat uses `appId: 2` and `messageType: 1` (where `toId` is the recipient's `userId`).
- **WebSocket Behavior**: The backend will only push the message to the online recipient; the sender does not receive an echo.
- **Data Flow**: Sender UI optimistic update → WebSocket send (`appId: 2`) → Receiver gets WebSocket message (`appId: 2`) → Store processes and triggers reactivity.

### Unknowns (NEEDS CLARIFICATION)
- **Local Storage Strategy for Chat History**: Should private messages be cached locally (e.g., IndexedDB) to improve load performance, or strictly fetched from the server via `/message/private/history` upon opening a chat session?
- **Friend Request Flow**: Does `/friend/add` automatically establish a relationship, or is there a pending/accept workflow? (Current API docs suggest a direct success response, implying an automatic or one-sided add, but this requires confirmation).
- **Unread Message Notification System**: When receiving a private message while in another view, how should the application structure the unread badge counter for the specific user?

## 2. Constitution Check

- **Architecture Principle**: HTTP API interactions will remain inside `src/api/index.ts`. Real-time processing will be added to the existing `WebSocketService` in `src/websocket/index.ts`.
- **Communication Principle**: Follow the JSON format (`appId: 2`) as dictated by the latest `NETTY_API_DOCS.md`.
- **State Management**: A new Pinia store `useFriendStore` or an extension of `useChatStore` should be utilized to hold friend lists and private chat message structures independently from group chat rooms.

## 3. Phase 0: Outline & Research

### Objectives
Resolve all "NEEDS CLARIFICATION" points and design the optimal UI/State layout.

**Pending Actions:**
- Output findings in `specs/research.md`.

## 4. Phase 1: Design & Contracts

### 4.1 Data Models (`specs/data-model.md`)
Extract and document the entity interfaces required in `src/types/index.ts`.
- `FriendResponse`
- `PrivateMessage`
- Extending `CompleteMessage` definitions (if necessary).

### 4.2 API Contracts (`specs/contracts/api.md`)
Map the backend HTTP and WebSocket contracts to frontend Axios functions and WebSocket event emitters.

## 5. Phase 2: Implementation Breakdown

### 5.1 Step 1: Types & API Layer
- Update `src/types/index.ts` with `FriendResponse` and `PrivateMessage` interfaces.
- Extend `src/api/index.ts` to include `friendApi` (`add`, `remove`, `list`) and `messageApi` (`private/history`, `chatroom/history`).

### 5.2 Step 2: State Management (Pinia)
- Create `src/stores/friend.ts` to manage friend list state.
- Update `src/stores/chat.ts` to support private message maps (e.g., keyed by `friendId`).
- Add logic to handle incoming `appId: 2` WebSocket events in the store.

### 5.3 Step 3: WebSocket Service Expansion
- Update `WebSocketService` in `src/websocket/index.ts` to parse and emit events for `appId: 2`.
- Add `sendPrivateMessage(uid, token, toId, content)` method.

### 5.4 Step 4: UI Components Development
- **Friend List Sidebar/View**: Create a component to list friends, show online status, and provide an "Add Friend" form.
- **Private Chat Window**: Create a view/component identical or similar to the chat room view, but scoped to a single friend.
- **Optimistic Updates**: Ensure UI reflects messages instantly when sending private chats.

### 5.5 Step 5: Integration & Testing
- Test adding/removing friends.
- Test sending a private message to an online friend (verify 500ms delivery).
- Test fetching chat history when opening a chat with an offline/previously chatted friend.
