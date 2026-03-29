# Implementation Tasks: User Private Chat and Friend Management

## Overview
This document outlines the step-by-step implementation tasks required to introduce one-to-one private chatting and friend management into the existing Vue 3 application. The breakdown is strictly organized by user story and designed to ensure existing group chatroom and login functionalities remain undisturbed.

---

## Phase 1: Setup & Foundational (Prerequisites)

These tasks must be completed before any specific user story can be addressed. They lay the groundwork for API and WebSocket extensions.

### [Story] Infrastructure Setup
**Goal**: Establish the base Typescript interfaces, Axios API wrappers, and WebSocket enhancements needed for the new features.

- [ ] **T001: Define Data Models**
  - **File**: `src/types/index.ts`
  - **Action**: Append the new interfaces `Friend`, `FriendListResponse`, `PrivateMessageHistory`, and `PrivateMessageHistoryResponse` as defined in `specs/data-model.md`.
  - **Parallelizable**: Yes `[P]`

- [ ] **T002: Extend HTTP API Definitions**
  - **File**: `src/api/index.ts`
  - **Action**: Add `friendApi` (addFriend, removeFriend, getFriendList) and update `messageApi` (getPrivateHistory, getChatRoomHistory) as defined in `specs/contracts/api.md`.
  - **Parallelizable**: Yes `[P]`

- [ ] **T003: Extend WebSocket Service for Private Chat**
  - **File**: `src/websocket/index.ts`
  - **Action**: 
    - Update `WebSocketEvents` type to include `'message:private': CompleteMessage;`.
    - Add the method `sendPrivateMessage(uid: number, token: string, friendId: number, content: string): void`.
    - Update the `onmessage` handler to intercept `appId === 2` and `messageType === 1` and emit `'message:private'`.
  - **Parallelizable**: No (Depends on T001)

- [ ] **T004: Initialize Friend Store (Pinia)**
  - **File**: `src/stores/friend.ts` (Create new file)
  - **Action**: Scaffold a new Pinia store `useFriendStore` to manage `friends` (array), `privateMessages` (record map), `unreadCounts` (record map), and `activeFriendId` (number | null). Set up basic actions like `fetchFriends()`.
  - **Parallelizable**: No (Depends on T001, T002)

---

## Phase 2: User Story 1 - Friend Management (P1)

**Goal**: Users can view their friend list, add new friends, and remove existing friends.
**Independent Test Criteria**: A user can open the friend sidebar, see their current friends, input an ID to add a friend, and click a button to remove a friend. Data correctly persists across page reloads (via API).

### Implementation Tasks

- [ ] **T005: Implement Friend Store Actions**
  - **File**: `src/stores/friend.ts`
  - **Action**: Implement `addFriend(friendId)`, `removeFriend(friendId)`, and fully wire up `fetchFriends()` using `friendApi`. Update the reactive `friends` array upon success.
  - **Parallelizable**: Yes `[P]`

- [ ] **T006: Create Friend List Component**
  - **File**: `src/components/friend/FriendList.vue` (Create new component)
  - **Action**: Build a UI component to render the list of friends using `useFriendStore`. Include online/offline status indicators.
  - **Parallelizable**: Yes `[P]`

- [ ] **T007: Create Friend Management Controls (Add/Remove)**
  - **File**: `src/components/friend/FriendList.vue`
  - **Action**: Add an input/button for "Add Friend by ID" that calls the store's `addFriend` action. Add a "Remove" button next to each friend in the list.
  - **Parallelizable**: No (Depends on T006)

- [ ] **T008: Integrate Friend List into Main Layout**
  - **File**: `src/views/LobbyView.vue` (or equivalent main layout)
  - **Action**: Mount the `FriendList` component alongside or in a separate tab from the existing group chatroom list. Ensure existing group chat layout is not broken.
  - **Parallelizable**: No (Depends on T007)

---

## Phase 3: User Story 2 - Private Messaging (P1)

**Goal**: Users can click on a friend to open a private chat window, send messages, and receive real-time messages.
**Independent Test Criteria**: Opening a friend's chat fetches history. Sending a message displays it instantly (optimistic). The recipient (if online) receives the message instantly via WebSocket without needing to refresh.

### Implementation Tasks

- [ ] **T009: Implement Message History Fetching**
  - **File**: `src/stores/friend.ts`
  - **Action**: Add `fetchPrivateHistory(friendId)` action. Call `messageApi.getPrivateHistory`, map the history to the `privateMessages` state dictionary, and sort by timestamp.
  - **Parallelizable**: Yes `[P]`

- [ ] **T010: Implement Sending Private Messages**
  - **File**: `src/stores/friend.ts`
  - **Action**: Add `sendPrivateMessage(content: string)` action.
    - Perform optimistic update: generate a temporary message object and push it to `privateMessages[activeFriendId]`.
    - Call `webSocketService.sendPrivateMessage(...)`.
  - **Parallelizable**: Yes `[P]`

- [ ] **T011: Implement Receiving Private Messages**
  - **File**: `src/stores/friend.ts`
  - **Action**: Create an initialization function (e.g., `initFriendWebSocket()`) that subscribes to `webSocketService.on('message:private', handleIncomingPrivateMessage)`. 
    - Inside the handler, push the incoming message to the correct `privateMessages[friendId]` array.
    - If `activeFriendId !== friendId`, increment `unreadCounts[friendId]`.
    - Ensure filtering logic is in place (in case of unexpected self-echo, though docs say backend excludes sender).
  - **Parallelizable**: No (Depends on T003, T004)

- [ ] **T012: Create Private Chat Window Component**
  - **File**: `src/components/friend/PrivateChatWindow.vue` (Create new component)
  - **Action**: Build a chat UI (similar to the existing group chat). It should bind to `useFriendStore().privateMessages[activeFriendId]`, display message bubbles, and include a text input area bound to `sendPrivateMessage`.
  - **Parallelizable**: Yes `[P]`

- [ ] **T013: Wire Navigation & Unread Badges**
  - **File**: `src/components/friend/FriendList.vue` & `src/stores/friend.ts`
  - **Action**: 
    - Clicking a friend in the list sets `activeFriendId`, clears their `unreadCount`, and triggers `fetchPrivateHistory`.
    - Render an Element Plus Badge (`<el-badge>`) on the friend item showing the `unreadCount`.
  - **Parallelizable**: No (Depends on T011, T012)

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] **T014: Bootstrap Store Initialization**
  - **File**: `src/views/LobbyView.vue` (or `App.vue`)
  - **Action**: Ensure `useFriendStore().fetchFriends()` and the WebSocket listener subscription (`initFriendWebSocket()`) are called upon successful login/entering the main layout, parallel to the chat room initializations.

- [ ] **T015: Comprehensive Integration Testing**
  - **Action**: Manually test the end-to-end flow:
    1. Login with User A, add User B.
    2. Login with User B, verify friend list (if bidirectional).
    3. User A sends message to B. Verify A sees 1 optimistic message, B sees 1 received message with unread badge if tab is not focused.
    4. Verify standard group chatrooms (`appId: 1`) still function perfectly.

## Execution Order Dependency Graph

```text
Phase 1:
[T001] -> [T003]
[T002] -> [T004]

Phase 2 (Friend Management):
(T001, T002, T004) -> [T005, T006] -> [T007] -> [T008]

Phase 3 (Private Chat):
[T003, T004] -> [T009, T010, T011, T012] -> [T013]

Final Phase:
(All above) -> [T014] -> [T015]
```