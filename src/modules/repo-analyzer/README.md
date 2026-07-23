# Repo Analyzer

分析 GitHub 仓库的详细信息。

## 功能

- **README 分析** - 提取摘要、章节、图片和徽章检测
- **目录结构** - 生成目录树、统计文件和目录数量
- **技术栈检测** - 语言、框架、工具、包管理器
- **Git 提交** - 最近提交记录
- **License 检测** - 自动识别开源协议

## 支持的协议

MIT, Apache-2.0, GPL-3.0, GPL-2.0, BSD-3-Clause, BSD-2-Clause, ISC, LGPL, MPL, Unlicense

## 支持的框架

React, Vue.js, Angular, Svelte, Express, Fastify, NestJS, Django, Flask, FastAPI, Spring, Rails

## 使用方法

```typescript
import { analyzeRepo } from './modules/repo-analyzer';

const analysis = await analyzeRepo('/path/to/repo');

console.log(analysis.readme.summary);
console.log(analysis.techStack.languages);
console.log(analysis.recentCommits);
```
