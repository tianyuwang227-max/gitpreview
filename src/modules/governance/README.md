# Governance Module

运行治理模块，负责资源管理、访问控制和自动清理。

## 功能

- 磁盘配额检查
- 访问速率限制
- 自动清理旧文件
- 访问统计
- 告警管理

## 使用方法

```typescript
import {
  governanceManager,
  getDiskUsage,
  checkRequestAllowed,
  accessTracker,
} from './modules/governance';

// 检查请求是否允许
const check = await checkRequestAllowed(clientIp);
if (!check.allowed) {
  return res.status(429).json({ error: check.reason });
}

// 记录访问
accessTracker.recordRequest(duration, true, clientIp);

// 获取磁盘使用
const disk = await getDiskUsage(process.cwd());
console.log(`磁盘使用: ${disk.totalMB}MB`);

// 手动清理
await governanceManager.performCleanup();
```

## 配置

```typescript
const config = {
  diskQuotaMB: 5000,           // 磁盘配额 5GB
  autoCleanupEnabled: true,     // 自动清理
  cleanupThresholdPercent: 80,  // 清理阈值 80%
  maxPreviewAge: 3600000,       // 最大预览时间 1小时
  rateLimitWindow: 60000,       // 限流窗口 1分钟
  rateLimitMax: 60,             // 最大请求数
};
```

## API

| 函数 | 说明 |
|------|------|
| `getDiskUsage(path)` | 获取磁盘使用情况 |
| `checkDiskQuota(quotaMB)` | 检查磁盘配额 |
| `checkRequestAllowed(ip)` | 检查请求是否允许 |
| `cleanupOldFiles(path, maxAge)` | 清理旧文件 |
| `accessTracker.getStats()` | 获取访问统计 |
| `governanceManager.getAlerts()` | 获取告警列表 |
