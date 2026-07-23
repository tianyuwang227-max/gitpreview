# WebSocket Module

实时进度推送功能。

## 功能

- WebSocket 连接管理
- 任务订阅/取消订阅
- 实时进度广播
- 任务完成/错误通知

## 使用方法

### 服务端

```typescript
import { initWebSocket, sendProgress, sendCompleted } from './modules/websocket';

// 初始化
initWebSocket(server);

// 发送进度
sendProgress(taskId, 50, '正在克隆代码...');

// 发送完成
sendCompleted(taskId, result);
```

### 客户端

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  // 订阅任务
  ws.send(JSON.stringify({ type: 'subscribe', taskId: 'task_123' }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'progress':
      console.log(`${message.progress}%: ${message.message}`);
      break;
    case 'completed':
      console.log('任务完成:', message.data);
      break;
    case 'error':
      console.error('任务失败:', message.message);
      break;
  }
};
```

## 消息格式

```typescript
interface WebSocketMessage {
  type: 'progress' | 'completed' | 'error' | 'connected';
  taskId?: string;
  data?: any;
  message?: string;
  progress?: number;
  timestamp: string;
}
```
