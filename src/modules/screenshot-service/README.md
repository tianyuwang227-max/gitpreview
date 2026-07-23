# Screenshot Service

截取 GitHub 仓库页面截图。

## 功能

- 截取任意网页截图
- 支持自定义视窗大小
- 支持全页截图
- 自动缓存截图结果

## 使用方法

```typescript
import { captureGitHubRepo, captureWithCache } from './modules/screenshot-service';

// 截取 GitHub 仓库页面
const result = await captureGitHubRepo('facebook', 'react');
console.log(result.imagePath);

// 自定义截图
const custom = await captureWithCache({
  url: 'https://example.com',
  width: 1920,
  height: 1080,
  fullPage: true,
});
```

## 配置

环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| CLONE_TIMEOUT | 页面加载超时(ms) | 60000 |
