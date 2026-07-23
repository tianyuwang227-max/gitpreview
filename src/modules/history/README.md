# History Module

用户浏览历史记录管理。

## 功能

- 记录浏览历史
- 搜索历史
- 筛选历史
- 统计分析
- 清除历史

## 使用方法

```typescript
import { addToHistory, getHistory, getHistoryStats } from './modules/history';

// 添加历史
await addToHistory({
  url: 'https://github.com/facebook/react',
  owner: 'facebook',
  name: 'react',
  fullName: 'facebook/react',
  description: 'A JavaScript library for building user interfaces',
  language: 'JavaScript',
  stars: 231000,
  previewType: 'screenshot',
});

// 获取历史
const history = await getHistory(50, 0);

// 获取统计
const stats = await getHistoryStats();
```
