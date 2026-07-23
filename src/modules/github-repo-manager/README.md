# GitHub Repository Manager

管理 GitHub 仓库的克隆和本地存储。

## 功能

- 验证 GitHub URL 格式
- 获取仓库元信息（stars、language、description）
- 克隆仓库到本地（支持 shallow clone）
- 管理已克隆仓库的索引

## 使用方法

```typescript
import { processGithubUrl } from './modules/github-repo-manager';

const result = await processGithubUrl('https://github.com/owner/repo');
console.log(result);
// {
//   success: true,
//   localPath: './projects/owner/repo',
//   repo: { ... },
//   clonedAt: Date
// }
```

## 单独使用子模块

```typescript
import { validateGithubUrl } from './modules/github-repo-manager';
import { fetchRepoInfo } from './modules/github-repo-manager';
import { cloneRepo } from './modules/github-repo-manager';

// 1. 验证 URL
const validation = validateGithubUrl(url);

// 2. 获取仓库信息
const repoInfo = await fetchRepoInfo('owner', 'repo');

// 3. 克隆仓库
const result = await cloneRepo(repoInfo, true); // true = shallow clone
```

## 配置

环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| GITHUB_TOKEN | GitHub API Token | - |
| CLONE_BASE_DIR | 克隆目录 | ./projects |
| CLONE_TIMEOUT | 克隆超时(ms) | 60000 |
