# Deployment Guide

GitPreview 支持多种部署方式。

## 快速部署

### Vercel (推荐)

1. Fork 本仓库
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量：
   - `GITHUB_TOKEN`: GitHub API Token
4. 部署完成

### Railway

1. 在 [Railway](https://railway.app) 创建新项目
2. 连接 GitHub 仓库
3. 配置环境变量
4. 自动部署

### Docker

```bash
# 构建镜像
docker build -t gitpreview .

# 运行容器
docker run -d \
  --name gitpreview \
  -p 3000:3000 \
  -e GITHUB_TOKEN=your_token \
  -v $(pwd)/data:/app/data \
  gitpreview
```

### Docker Compose

```yaml
version: '3.8'
services:
  gitpreview:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

## 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| NODE_ENV | 否 | development | 运行环境 |
| PORT | 否 | 3000 | 服务端口 |
| GITHUB_TOKEN | 否 | - | GitHub API Token |
| CLONE_BASE_DIR | 否 | ./projects | 克隆目录 |
| CORS_ORIGIN | 否 | * | CORS 配置 |

## 生产环境优化

### 1. 启用 GitHub Token

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### 2. 配置反向代理 (Nginx)

```nginx
server {
    listen 80;
    server_name gitpreview.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 启用 HTTPS

```bash
# 使用 Certbot
sudo certbot --nginx -d gitpreview.example.com
```

### 4. 配置 PM2

```bash
npm install -g pm2
pm2 start dist/modules/web-server/index.js --name gitpreview
pm2 save
pm2 startup
```

## 监控

### 健康检查

```bash
curl http://localhost:3000/api/health
```

### 日志

```bash
# PM2 日志
pm2 logs gitpreview

# Docker 日志
docker logs gitpreview
```

## 故障排除

### 问题：Puppeteer 无法启动

```bash
# 安装依赖
apt-get update && apt-get install -y \
  chromium \
  fonts-ipafont-gothic \
  fonts-freefont-tty \
  --no-install-recommends
```

### 问题：Git clone 失败

检查 Git 是否安装：
```bash
git --version
```

### 问题：API 限速

配置 GitHub Token：
```bash
export GITHUB_TOKEN=your_token
```
