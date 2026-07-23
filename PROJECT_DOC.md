# GitPreview

> Preview GitHub projects without manual deployment.

---

## 项目概述

GitPreview 是一个工具，让用户无需手动部署即可快速查看 GitHub 开源项目的实际运行效果。

### 核心功能

- **GitHub URL 验证** - 支持 HTTPS 和 SSH 格式
- **仓库信息获取** - 获取 stars、language、description 等元数据
- **Git Clone** - 支持 shallow clone 加速
- **页面截图** - 使用 Headless Chrome 截取仓库页面
- **Web 界面** - 现代化 UI，输入 URL 即可预览
- **REST API** - 可扩展的后端接口
- **异步任务队列** - 长耗时操作异步处理
- **智能缓存** - TTL 和容量限制的缓存策略
- **结构化错误处理** - 细化的错误码体系

---

## 项目结构

```
gitpreview/
├── src/
│   ├── modules/
│   │   ├── github-repo-manager/
│   │   │   ├── index.ts          # 模块入口
│   │   │   ├── types.ts          # 类型定义
│   │   │   ├── validator.ts      # URL 验证
│   │   │   ├── fetcher.ts        # 获取仓库信息
│   │   │   ├── cloner.ts         # Git 克隆
│   │   │   └── storage.ts        # 存储管理
│   │   ├── screenshot-service/
│   │   │   ├── index.ts          # 模块入口
│   │   │   ├── types.ts          # 类型定义
│   │   │   ├── screenshot.ts     # 截图服务
│   │   │   └── storage.ts        # 截图缓存
│   │   └── web-server/
│   │       ├── index.ts          # 服务器入口
│   │       ├── types.ts          # API 类型
│   │       └── server.ts         # Express 服务
│   ├── config/
│   │   └── index.ts              # 全局配置
│   └── utils/
│       ├── logger.ts             # 日志工具
│       ├── errors.ts             # 错误处理
│       ├── task-queue.ts         # 异步任务队列
│       └── cache.ts              # 缓存管理
├── public/
│   └── index.html                # 前端页面
├── projects/                     # 克隆项目存储
├── data/
│   └── repos.json                # 仓库索引
├── tests/
│   ├── validator.test.ts         # URL 验证测试
│   ├── integration.test.ts       # 集成测试
│   ├── screenshot-storage.test.ts # 截图存储测试
│   └── screenshot-manual.ts      # 手动截图测试
├── package.json
├── tsconfig.json
├── jest.config.js
├── .gitignore
├── .env.example
├── PROJECT_RULES.md              # 开发规范
└── README.md
```

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript |
| 运行时 | Node.js |
| Web 框架 | Express |
| Git 操作 | simple-git |
| HTTP 客户端 | axios |
| 截图 | Puppeteer |
| 日志 | winston |
| 测试 | Jest |

---

## 快速开始

### 安装

```bash
# 克隆项目
git clone <repo-url>
cd gitpreview

# 安装依赖
npm install
```

### 配置

创建 `.env` 文件：

```env
# GitHub Token (可选，提高 API 限速)
GITHUB_TOKEN=ghp_xxxx

# 项目存储路径
CLONE_BASE_DIR=./projects

# 克隆超时 (毫秒)
CLONE_TIMEOUT=60000

# 服务器端口
PORT=3000
```

### 运行

```bash
# 启动 Web 服务器
npm run dev

# 运行测试
npm test
```

访问 `http://localhost:3000`

---

## API 文档

### POST /api/preview

获取 GitHub 仓库预览。

**请求:**
```json
{
  "url": "https://github.com/facebook/react",
  "async": false
}
```

**参数:**
- `url` (必需): GitHub 仓库 URL
- `async` (可选): 是否异步处理，默认 false

**同步响应:**
```json
{
  "success": true,
  "data": {
    "repo": {
      "owner": "facebook",
      "name": "react",
      "fullName": "facebook/react",
      "description": "The library for web and native user interfaces.",
      "language": "JavaScript",
      "stars": 231000,
      "forks": 47000,
      "url": "https://github.com/facebook/react",
      "defaultBranch": "main",
      "size": 12345
    },
    "screenshot": {
      "imagePath": "/screenshots/github_com_facebook_react_xxx.png",
      "url": "https://github.com/facebook/react",
      "metadata": {
        "width": 1280,
        "height": 900,
        "format": "png",
        "fileSize": 208322
      }
    }
  },
  "timestamp": "2026-07-23T07:30:00.000Z"
}
```

**异步响应 (async=true):**
```json
{
  "success": true,
  "data": { "taskId": "task_1234567890_abc123" },
  "timestamp": "2026-07-23T07:30:00.000Z"
}
```

### GET /api/tasks/:taskId

查询异步任务状态。

**响应:**
```json
{
  "success": true,
  "data": {
    "taskId": "task_1234567890_abc123",
    "status": "completed",
    "result": { ... },
    "progress": 100
  },
  "timestamp": "2026-07-23T07:30:00.000Z"
}
```

**状态值:**
- `pending`: 等待处理
- `processing`: 处理中
- `completed`: 已完成
- `failed`: 失败

### GET /api/health

健康检查。

**响应:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "tasks": {
      "total": 10,
      "pending": 0,
      "processing": 1,
      "completed": 8,
      "failed": 1
    }
  },
  "timestamp": "2026-07-23T07:30:00.000Z"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "REPO_NOT_FOUND",
    "message": "Repository owner/repo not found",
    "details": { "owner": "owner", "repo": "repo" }
  },
  "timestamp": "2026-07-23T07:30:00.000Z"
}
```

**错误码:**
| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| INVALID_URL | 400 | URL 格式无效 |
| NOT_GITHUB_URL | 400 | 非 GitHub URL |
| REPO_NOT_FOUND | 404 | 仓库不存在 |
| REPO_PRIVATE | 403 | 私有仓库 |
| GITHUB_RATE_LIMIT | 429 | API 限流 |
| CLONE_FAILED | 500 | 克隆失败 |
| CLONE_TIMEOUT | 504 | 克隆超时 |
| SCREENSHOT_FAILED | 500 | 截图失败 |

---

## 测试结果

```
✓ validator.test.ts          (6 passed)
✓ screenshot-storage.test.ts (3 passed)
✓ integration.test.ts        (2 passed)
```

### 截图测试

| 仓库 | 文件大小 | 耗时 | 状态 |
|------|----------|------|------|
| facebook/react | 208KB | ~8s | ✅ |
| vuejs/vue | 201KB | ~8s | ✅ |
| sveltejs/svelte | 212KB | ~6s | ✅ |
| expressjs/express | 205KB | ~6s | ✅ |

---

## 使用示例

### CLI 方式

```typescript
import { processGithubUrl } from './src/modules/github-repo-manager';

const result = await processGithubUrl('https://github.com/facebook/react');
console.log(result);
```

### 截图服务

```typescript
import { captureGitHubRepo } from './src/modules/screenshot-service';

const screenshot = await captureGitHubRepo('facebook', 'react');
console.log(screenshot.imagePath);
```

### Web API

```bash
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/facebook/react"}'
```

---

## 开发规范

详见 [PROJECT_RULES.md](PROJECT_RULES.md)

### 核心规则

1. **代码结构** - 模块化设计，每个模块独立
2. **命名规范** - 文件 kebab-case，类 PascalCase，函数 camelCase
3. **错误处理** - 使用自定义错误类
4. **日志** - 使用 winston 统一日志
5. **测试** - 核心功能必须有单元测试
6. **提交** - 遵循 Conventional Commits

---

## 后续规划

### MVP (当前)
- [x] GitHub URL 验证
- [x] 仓库信息获取
- [x] Git Clone
- [x] 页面截图
- [x] Web 界面
- [x] 异步任务队列
- [x] 智能缓存
- [x] 结构化错误处理

### Phase 2
- [ ] Docker 容器化运行项目
- [ ] 实时预览 iframe
- [ ] 项目分类和搜索
- [ ] 用户收藏功能

### Phase 3
- [ ] 浏览器扩展
- [ ] AI 项目摘要
- [ ] 社区分享功能
- [ ] 多语言支持

---

## 许可证

MIT

---

## 联系方式

- GitHub: [项目地址]
- Issues: [问题反馈]
