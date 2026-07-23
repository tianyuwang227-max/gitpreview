# Discovery Module

项目发现和探索功能。

## 功能

- **热门项目** - 获取 GitHub 热门项目
- **项目搜索** - 按关键词搜索项目
- **分类浏览** - 按类别浏览项目
- **收藏功能** - 收藏喜欢的项目

## 支持的分类

| 分类 | 说明 |
|------|------|
| Web Frameworks | 前后端 Web 框架 |
| Mobile Apps | 移动应用 |
| CLI Tools | 命令行工具 |
| Data Science | 数据科学 |
| DevOps | 开发运维 |
| Games | 游戏 |
| APIs & Services | API 服务 |
| Security | 安全工具 |

## 使用方法

```typescript
import {
  getTrending,
  searchProjects,
  getCategories,
  favoritesManager,
} from './modules/discovery';

// 获取热门项目
const trending = await getTrending('typescript');

// 搜索项目
const results = await searchProjects('react ui library');

// 获取分类
const categories = getCategories();

// 添加收藏
await favoritesManager.addFavorite(project);
```
