# GitPreview (Personal Edition)

**个人本地使用的 GitHub 仓库预览工具**

> ⚠️ 本工具仅用于预览本人信任的 GitHub 仓库代码，不是安全沙箱，不得用于运行不可信代码。

## 功能

- **Screenshot 模式** - 截取 GitHub 仓库页面
- **Live Preview 模式** - 在本地运行可信仓库（需配置）
- **仓库分析** - README、技术栈、目录结构

## 快速开始

```bash
# 克隆
git clone https://github.com/tianyuwang227-max/gitpreview.git
cd gitpreview

# 安装
npm ci

# 构建
npm run build

# 配置可信仓库
cp .gitpreview/trusted-repos.json.example .gitpreview/trusted-repos.json
# 编辑 .gitpreview/trusted-repos.json

# 启动（仅本地访问）
npm start
```

访问 http://127.0.0.1:3000

## 可信仓库配置

Live Preview 只运行配置中的可信仓库。

编辑 `.gitpreview/trusted-repos.json`：

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

| 字段 | 说明 |
|------|------|
| `owner` | 仓库所有者 |
| `repo` | 仓库名 |
| `ref` | 固定分支/commit（可选） |
| `allowScripts` | 是否允许 npm scripts（默认 false） |
| `startCommand` | 自定义启动命令（可选） |
| `port` | 自定义端口（可选） |

## 安全说明

- 服务仅监听 `127.0.0.1`，不支持公网访问
- 不读取或传递 GITHUB_TOKEN 给被预览项目
- 默认使用 `npm ci --ignore-scripts` 安装依赖
- 只有配置中的可信仓库可以运行 Live Preview
- 进程树终止、超时回收、端口释放

## API

```bash
# 截图模式
curl -X POST http://127.0.0.1:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/octocat/Hello-World", "mode": "screenshot"}'

# Live Preview（需在可信列表中）
curl -X POST http://127.0.0.1:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/vitejs/vite", "mode": "live"}'

# 健康检查
curl http://127.0.0.1:3000/api/health
```

## 开发

```bash
npm test        # 运行测试
npm run lint    # 代码检查
npm run build   # 构建
```

## 项目结构

```
gitpreview/
├── src/
│   ├── modules/
│   │   ├── github-repo-manager/   # 仓库管理
│   │   ├── screenshot-service/    # 截图服务
│   │   ├── preview-runner/        # 预览运行
│   │   ├── repo-analyzer/         # 仓库分析
│   │   ├── trusted-repos/         # 可信仓库
│   │   └── web-server/            # Web 服务
│   ├── config/
│   └── utils/
├── .gitpreview/                   # 可信仓库配置
├── public/                        # 前端
└── tests/
```

## License

MIT
