# Vue IM 聊天应用

一个基于 Vue 3 + TypeScript + Element Plus 的现代化即时通讯应用，支持实时聊天、文件传输、主题切换等功能。

## ✨ 特性

- 🎨 现代化 UI 设计，支持亮色/暗色主题
- 💬 实时聊天，支持文本、图片、文件消息
- 🔐 用户认证与权限管理
- 📱 响应式设计，适配多种设备
- 🎭 玻璃拟态效果和流畅动画
- 🔔 消息通知与已读状态
- 👥 在线状态显示
- ⚡ WebSocket 实时通信
- 📦 TypeScript 类型安全

## 🛠️ 技术栈

- **前端框架**: Vue 3
- **开发语言**: TypeScript
- **构建工具**: Vite
- **UI 组件库**: Element Plus
- **状态管理**: Pinia
- **路由管理**: Vue Router
- **HTTP 客户端**: Axios
- **实时通信**: WebSocket
- **样式预处理**: SCSS
- **工具库**: VueUse、Day.js

## 📁 项目结构

```
vue-im-frontend/
├── src/
│   ├── api/              # API 接口管理
│   ├── components/       # 公共组件
│   ├── router/           # 路由配置
│   ├── stores/           # Pinia 状态管理
│   ├── styles/           # 全局样式
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   ├── views/            # 页面组件
│   ├── websocket/        # WebSocket 管理
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── public/               # 静态资源
├── package.json          # 项目配置
├── vite.config.ts        # Vite 配置
└── tsconfig.json         # TypeScript 配置
```

## 🚀 快速开始

### 环境要求

- Node.js 16+ 
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 🔧 配置说明

### 环境变量

创建 `.env.local` 文件配置本地环境变量：

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
```

### 后端 API 集成

本项目需要配合 Spring Boot 后端使用，主要接口包括：

- 用户认证：`/auth/login`、`/auth/register`
- 用户管理：`/users/profile`、`/users/avatar`
- 聊天功能：`/chat/rooms`、`/chat/messages`
- 文件上传：`/chat/upload`

### WebSocket 连接

WebSocket 用于实时消息推送，支持以下消息类型：

- `message`: 聊天消息
- `user_join`: 用户上线
- `user_leave`: 用户下线
- `typing`: 正在输入状态
- `heartbeat`: 心跳检测

## 🎨 界面展示

### 登录页面
- 渐变背景 + 玻璃拟态效果
- 流畅的动画过渡
- 响应式表单验证

### 聊天界面
- 现代化卡片式聊天列表
- 消息气泡设计 + 实时动效
- 支持文本、图片、文件消息
- 实时在线状态显示

### 设置页面
- 个人信息管理
- 主题切换功能
- 通知设置

## 🔮 功能特性

### 实时聊天
- 支持一对一和群组聊天
- 消息状态跟踪（发送中、已发送、已送达、已读）
- 正在输入状态提示
- 消息时间戳显示

### 文件传输
- 图片预览和发送
- 文件上传和下载
- 支持多种文件格式

### 用户体验
- 流畅的页面切换动画
- 响应式设计适配移动端
- 深色/浅色主题切换
- 消息通知提醒

## 📝 开发指南

### 代码规范
- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- 遵循 Vue 3 Composition API 最佳实践

### 组件开发
- 使用 TypeScript 进行类型检查
- 遵循单一职责原则
- 保持组件的可复用性

### 状态管理
- 使用 Pinia 进行状态管理
- 按功能模块划分 store
- 保持状态的不可变性

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进项目。

## 📄 许可证

MIT License