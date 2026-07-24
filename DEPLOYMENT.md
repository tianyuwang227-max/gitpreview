# Deployment Guide

GitPreview 支持多种部署方式。

## 推荐部署方式

### VPS / 专用服务器（推荐）

GitPreview 需要：
- 运行子进程
- 动态分配端口
- 长生命周期进程

因此推荐使用 VPS 或专用服务器部署。

#### 系统要求

- Node.js 18+
- Git
- 2GB+ RAM
- 20GB+ 磁盘空间

#### 部署步骤

```bash
# 1. 克隆仓库
git clone https://github.com/tianyuwang227-max/gitpreview.git
cd gitpreview

# 2. 安装依赖
npm ci

# 3. 构建
npm run build

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 GITHUB_TOKEN

# 5. 启动服务
npm start
```

#### 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start dist/modules/web-server/index.js --name gitpreview

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs gitpreview

# 重启服务
pm2 restart gitpreview
```

#### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name preview.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # 预览代理
    location /preview/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### HTTPS 配置

```bash
# 使用 Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d preview.example.com
```

### Docker 部署

> ⚠️ 注意：Docker 部署需要特殊配置才能支持子进程运行。

```bash
# 构建镜像
docker build -t gitpreview .

# 运行容器
docker run -d \
  --name gitpreview \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v gitpreview-data:/app/data \
  -e GITHUB_TOKEN=${GITHUB_TOKEN} \
  --privileged \
  gitpreview
```

## 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| NODE_ENV | 否 | development | 运行环境 |
| PORT | 否 | 3000 | 服务端口 |
| GITHUB_TOKEN | 否 | - | GitHub API Token |
| CLONE_BASE_DIR | 否 | ./projects | 克隆目录 |
| CLONE_TIMEOUT | 否 | 60000 | 克隆超时(ms) |

## 安全配置

### 限制并发预览数

编辑 `src/utils/security.ts`:

```typescript
export const SECURITY_CONFIG = {
  maxConcurrentPreviews: 5,  // 最大同时预览数
  maxDiskUsageMB: 500,       // 磁盘使用上限
  maxProcessCount: 10,       // 最大进程数
  maxTimeoutMs: 300000,      // 超时时间
  maxIdleMs: 600000,         // 空闲超时
};
```

### 防火墙配置

```bash
# 只允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 监控

### 健康检查

```bash
curl http://localhost:3000/api/health
```

### 查看运行中的预览

```bash
curl http://localhost:3000/api/live-previews
```

### 日志

```bash
# PM2 日志
pm2 logs gitpreview

# 系统日志
journalctl -u gitpreview -f
```

## 故障排除

### 端口被占用

```bash
# 查看端口使用情况
lsof -i :3000

# 杀死占用进程
kill -9 <PID>
```

### 进程残留

```bash
# 查看所有 node 进程
ps aux | grep node

# 杀死所有相关进程
pkill -f gitpreview
```

### 磁盘空间不足

```bash
# 清理旧的预览文件
rm -rf projects/*

# 查看磁盘使用
df -h
du -sh projects/
```

## 不支持的部署平台

以下平台不适合 GitPreview：

- **Vercel**: 不支持长生命周期进程、端口代理
- **Netlify**: 不支持后端服务
- **Cloudflare Workers**: 不支持子进程
- **AWS Lambda**: 有执行时间限制

## 性能优化

### 增加文件描述符限制

```bash
# 编辑 /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
```

### 配置 swap

```bash
# 创建 2GB swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久启用
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
