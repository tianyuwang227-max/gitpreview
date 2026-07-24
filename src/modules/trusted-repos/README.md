# Trusted Repos Module

可信仓库管理模块，控制哪些仓库可以运行 live preview。

## 功能

- 加载可信仓库配置
- 验证仓库是否可信
- 获取仓库配置

## 配置文件

位置：`.gitpreview/trusted-repos.json`

```json
{
  "repos": [
    {
      "owner": "vitejs",
      "repo": "vite",
      "ref": "main",
      "allowScripts": false,
      "startCommand": "npm run dev",
      "port": 5173
    }
  ]
}
```

## 使用方法

```typescript
import { isRepoTrusted, getTrustedRepo } from './modules/trusted-repos';

// 检查仓库是否可信
const trusted = await isRepoTrusted('vitejs', 'vite');

// 获取仓库配置
const repo = await getTrustedRepo('vitejs', 'vite');
```
