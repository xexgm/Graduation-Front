# UI 重设计任务拆解（私聊 + 聊天室）

基于需求文档：`specs/ui-redesign-requirements.md`

## 目标

将当前“大厅页 + 聊天页”割裂体验，重构为“单一聊天工作台”，统一承载私聊与聊天室会话，并为后续模块扩展预留导航结构。

---

## Phase 0：产品决策锁定（前置）

这些任务不完成，后续实现会产生返工风险。

- [ ] **T001 锁定聊天室退出策略**
  - 选项：退出后从会话列表移除 / 保留灰态入口。
  - 产出：决策记录写入需求文档。

- [ ] **T002 锁定私聊空会话展示策略**
  - 选项：仅有好友关系也显示会话 / 首次聊天后才显示会话。
  - 产出：决策记录写入需求文档。

- [ ] **T003 锁定一级导航首期显示策略**
  - 选项：只显示“会话” / 显示占位入口（不可点击）。
  - 产出：决策记录写入需求文档。

---

## Phase 1：结构统一（工作台骨架）

### User Story A：用户在单页面完成所有聊天操作

- [ ] **T101 新建统一工作台视图**
  - 文件：`src/views/WorkspaceView.vue`（新建）
  - 内容：三栏骨架（一级导航 / 会话列表 / 会话内容）。
  - 验收：访问工作台后无需跳转即可看到聊天主结构。

- [ ] **T102 路由重构到统一工作台**
  - 文件：`src/router/index.ts`
  - 内容：
    - 新增或改造统一入口路由（例如 `/workspace` 或复用 `/chat`）。
    - `lobby` 与 `chat` 旧路由保留兼容跳转到统一工作台。
  - 验收：从旧入口进入时也落在同一工作台界面。

- [ ] **T103 提取一级导航组件（可扩展）**
  - 文件：`src/components/workspace/PrimaryNav.vue`（新建）
  - 内容：至少支持“会话”激活态，其他模块位可占位。
  - 验收：后续可无破坏新增模块入口。

- [ ] **T104 提取会话列表容器组件**
  - 文件：`src/components/workspace/ConversationListPane.vue`（新建）
  - 内容：承接搜索、列表渲染、会话点击事件。
  - 验收：可渲染混合会话（私聊 + 聊天室）的统一列表。

- [ ] **T105 提取会话内容容器组件**
  - 文件：`src/components/workspace/ConversationPanel.vue`（新建）
  - 内容：根据会话类型切换消息列表与输入区。
  - 验收：未选中会话时展示空状态；选中后展示聊天区。

---

## Phase 2：会话统一模型与状态收口

### User Story B：私聊和聊天室在同一列表中一致操作

- [ ] **T201 定义统一会话类型**
  - 文件：`src/types/index.ts`
  - 内容：新增 `Conversation`、`ConversationType`、`ConversationSummary` 等类型。
  - 字段建议：`conversationId`、`conversationType`、`title`、`avatar`、`lastMessage`、`lastMessageTime`、`unreadCount`。
  - 验收：类型可同时表达私聊与聊天室。

- [ ] **T202 新建会话聚合 Store**
  - 文件：`src/stores/conversation.ts`（新建）
  - 内容：
    - 管理统一会话列表与 `activeConversation`。
    - 聚合 `friendStore` 与 `chatStore` 数据源。
  - 验收：会话列表来源单一，页面不直接依赖多个 store 拼装。

- [ ] **T203 实现会话列表映射规则**
  - 文件：`src/stores/conversation.ts`
  - 内容：
    - 好友数据 -> 私聊会话映射。
    - 已加入聊天室 -> 聊天室会话映射。
    - 统一排序（最近消息时间优先）。
  - 验收：列表中可同时展示私聊与聊天室，排序稳定。

- [ ] **T204 实现会话点击行为统一入口**
  - 文件：`src/stores/conversation.ts`
  - 内容：`openConversation(conversation)` 统一处理：
    - 切换激活会话
    - 清未读
    - 拉历史（按会话类型分流）
  - 验收：点击任意会话都能正确打开右侧面板。

---

## Phase 3：行为改造（去页面割裂）

### User Story C：不再依赖“进入聊天页/退出回大厅”

- [ ] **T301 下线“进入聊天页”主按钮**
  - 文件：`src/views/LobbyView.vue`（若保留则改为跳统一工作台）
  - 内容：移除/改造入口文案和行为，避免二次心智。
  - 验收：用户从主入口直接进入统一工作台，不再手动切页。

- [ ] **T302 改造聊天室“退出”行为**
  - 文件：`src/components/ChatHeader.vue`、`src/stores/chat.ts`、`src/stores/conversation.ts`
  - 内容：退出聊天室只影响会话状态，不触发页面跳转。
  - 验收：退出后仍停留工作台，符合 T001 决策策略。

- [ ] **T303 统一私聊会话打开路径**
  - 文件：`src/components/friend/FriendList.vue`、`src/stores/friend.ts`、`src/stores/conversation.ts`
  - 内容：好友点击通过会话层入口打开，不绕过会话状态中心。
  - 验收：私聊与聊天室点击行为一致。

---

## Phase 4：数据安全与接口一致性

### User Story D：历史消息请求参数始终合法

- [ ] **T401 私聊历史参数校验加固**
  - 文件：`src/stores/friend.ts`、`src/api/index.ts`
  - 内容：请求前校验 `friendId` 为有效数字，禁止 `undefined/null/NaN`。
  - 验收：网络面板不再出现 `friendId=undefined`。

- [ ] **T402 聊天室历史参数校验加固**
  - 文件：`src/stores/chat.ts`、`src/api/index.ts`
  - 内容：请求前校验 `roomId` 有效，禁止脏参数请求。
  - 验收：网络面板不出现 `roomId=undefined`。

- [ ] **T403 多数据源更新策略统一**
  - 文件：`src/stores/conversation.ts`、`src/stores/friend.ts`、`src/stores/chat.ts`
  - 内容：统一轮询、WebSocket 推送、手动刷新的合并策略。
  - 验收：会话列表无明显闪烁和重复抖动。

---

## Phase 5：体验优化（本期可选）

### User Story E：会话列表更接近 PC IM 产品习惯

- [ ] **T501 会话搜索**
  - 文件：`src/components/workspace/ConversationListPane.vue`
  - 内容：按会话标题过滤（私聊昵称 + 聊天室名）。
  - 验收：输入关键字可即时筛选。

- [ ] **T502 会话项摘要显示**
  - 文件：`src/components/workspace/ConversationListItem.vue`（新建）
  - 内容：显示头像、标题、最后一条消息、时间、未读角标。
  - 验收：列表信息密度与层级清晰。

- [ ] **T503 空状态与错误提示优化**
  - 文件：`src/components/workspace/ConversationPanel.vue`
  - 内容：无会话、拉取失败、重试提示统一化。
  - 验收：用户可理解当前状态并执行下一步。

---

## Phase 6：验证与回归

- [ ] **T601 路由兼容回归**
  - 场景：从 `/lobby`、`/chat`、刷新页面进入，均稳定落到统一工作台。

- [ ] **T602 核心链路回归（私聊）**
  - 场景：点击会话 -> 拉历史 -> 发送 -> 接收 -> 未读变化。

- [ ] **T603 核心链路回归（聊天室）**
  - 场景：进入会话 -> 拉历史 -> 收发消息 -> 退出聊天室（不跳页）。

- [ ] **T604 参数安全回归**
  - 场景：无选中会话、异常状态切换时，不发脏请求。

- [ ] **T605 类型与规范检查**
  - 命令：`npm run type-check`、`npm run lint`
  - 验收：无新增类型错误与 lint 错误。

---

## 建议执行顺序（依赖图）

```text
T001~T003 (产品决策)
  -> T101~T105 (结构骨架)
  -> T201~T204 (会话模型与状态)
  -> T301~T303 (行为改造)
  -> T401~T403 (数据安全与一致性)
  -> T501~T503 (体验增强，可并行)
  -> T601~T605 (最终回归)
```

---

## 里程碑定义

- **M1（可演示）**：完成 Phase 1 + Phase 2，能在统一工作台打开私聊和聊天室会话。  
- **M2（可联调）**：完成 Phase 3 + Phase 4，主流程稳定且请求参数安全。  
- **M3（可交付）**：完成 Phase 6，回归通过；Phase 5 视排期纳入。  

