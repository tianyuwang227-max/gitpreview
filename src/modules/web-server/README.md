# Web Server

GitPreview 的 Web 服务器模块。

## 功能

- 静态文件服务
- REST API 接口
- 截图服务集成

## API 接口

### GET /api/health

健康检查接口。

**响应:**
```json
{
  "success": true,
  "data": { "status": "ok" },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/preview

获取 GitHub 仓库预览。

**请求体:**
```json
{
  "url": "https://github.com/owner/repo"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "repo": {
      "owner": "owner",
      "name": "repo",
      "fullName": "owner/repo",
      "description": "...",
      "language": "TypeScript",
      "stars": 1000,
      "forks": 100,
      "url": "https://github.com/owner/repo"
    },
    "screenshot": {
      "imagePath": "/screenshots/xxx.png",
      "url": "https://github.com/owner/repo",
      "metadata": {
        "width": 1280,
        "height": 900,
        "format": "png",
        "fileSize": 12345
      }
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 启动

```bash
npm run dev
```
