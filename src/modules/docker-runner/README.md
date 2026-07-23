# Docker Runner

在 Docker 容器中运行 GitHub 项目并截取预览图。

## 功能

- 自动检测项目类型 (Node.js, Python, Go, Static)
- 自动检测框架 (React, Vue, Next.js, Express, Flask 等)
- 自动生成 Dockerfile
- 构建 Docker 镜像
- 运行容器并截取截图
- 资源限制 (512MB RAM, 1 CPU)

## 支持的项目类型

| 类型 | 检测文件 | 默认端口 |
|------|----------|----------|
| Node.js | package.json | 3000 |
| Python | requirements.txt | 5000 |
| Go | go.mod | 8080 |
| Static | index.html | 80 |

## 支持的框架

### Node.js
- React (react-scripts)
- Next.js
- Vue.js
- Nuxt.js
- Express

### Python
- Flask
- Django

## 使用方法

```typescript
import { runAndCapture } from './modules/docker-runner';

const result = await runAndCapture('/path/to/repo', 'my-project');

if (result.success) {
  console.log('Screenshot:', result.screenshot);
} else {
  console.error('Error:', result.error);
}
```

## 依赖

- Docker Desktop
- Puppeteer

## 安全限制

- 内存限制: 512MB
- CPU 限制: 1 核
- 容器自动清理
- 网络隔离
