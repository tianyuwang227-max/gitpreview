# GitPreview Browser Extension

Chrome 浏览器扩展，让用户在 GitHub 页面直接预览仓库。

## 功能

- 在 GitHub 仓库页面添加"Preview"按钮
- 点击按钮弹出预览窗口
- 显示仓库截图、分析信息、技术栈
- 支持自定义服务器地址
- 实时 WebSocket 进度更新

## 安装

### 开发模式安装

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `extension` 目录

### 配置

1. 点击扩展图标打开设置
2. 输入 GitPreview 服务器地址（默认：http://localhost:3000）
3. 点击"Save Settings"

## 使用

1. 访问任意 GitHub 仓库页面
2. 在页面头部找到"Preview"按钮
3. 点击按钮查看仓库预览

## 文件结构

```
extension/
├── manifest.json           # 扩展配置
├── icons/                  # 扩展图标
├── content/
│   ├── content.js         # Content Script
│   └── content.css        # 样式
├── popup/
│   ├── popup.html         # 设置弹窗
│   └── popup.js           # 弹窗逻辑
└── background/
    └── service-worker.js  # 后台服务
```

## 权限说明

| 权限 | 用途 |
|------|------|
| activeTab | 访问当前标签页 |
| storage | 保存设置 |
| host_permissions | 访问 GitHub 和本地服务器 |

## WebSocket 支持

扩展支持 WebSocket 实时进度更新：
- 自动连接到 GitPreview 服务器的 WebSocket
- 订阅任务进度更新
- 实时显示加载进度条
- 断线自动重连
