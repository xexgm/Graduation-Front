# Data Model

本次需求主要修正客户端向后端发出的 WebSocket 数据包结构。

## Entities

### `CompleteMessage`
WebSocket 通信的核心载体，承载各种业务（登录、聊天室出入、心跳）的数据报文。

| Field       | Type   | Description                                       | Modified |
|-------------|--------|---------------------------------------------------|----------|
| `appId`     | number | 业务线ID: 0=Link(基础连接), 1=ChatRoom(聊天室)    | No       |
| `uid`       | number | 用户ID                                            | No       |
| `token`     | string | 用户Token                                         | No       |
| `messageType` | number | 消息类型：0=进入/建连, 1=发送/断开, 2=退出/心跳 | No       |
| `toId`      | number | 接收方ID (Link业务给0，ChatRoom给房间号)          | **Yes (强制必传)** |
| `content`   | string | 消息内容                                          | **Yes (不能为null，空则为"")**|
| `timeStamp` | number | 发送时间戳                                        | No       |
| `compression` | number?| 选填（预留）                                    | No       |
| `encryption` | number?| 选填（预留）                                     | No       |

## 调整要点
将原先前端接口中 `content: string | null` 强制更新为 `content: string`，不允许 `null`；同理，补充漏发的 `toId` 字段至各个业务方法中。