# GitPreview 开发规范

## 1. 代码结构

```
src/
├── modules/           # 功能模块
│   └── [module-name]/
│       ├── index.ts   # 模块入口
│       ├── types.ts   # 类型定义
│       └── *.ts       # 实现文件
├── config/            # 配置
└── utils/             # 工具函数
```

## 2. 命名规范

- 文件名: kebab-case (`url-validator.ts`)
- 类名: PascalCase (`UrlValidator`)
- 函数名/变量名: camelCase (`isValidUrl`)
- 常量: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- 接口: PascalCase，不加 I 前缀 (`RepoInfo`)

## 3. 模块规范

### 每个模块必须包含:
- `index.ts` - 统一导出
- `types.ts` - 类型定义
- `README.md` - 模块文档

### 模块导出规范:
```typescript
// index.ts
export { ClassName } from './file';
export type { TypeName } from './types';
```

## 4. 错误处理

```typescript
// 使用自定义错误类
class GitPreviewError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}
```

## 5. 日志规范

```typescript
import { logger } from '../utils/logger';

logger.info('Operation started', { repo: 'owner/repo' });
logger.error('Operation failed', { error: err.message });
```

## 6. 测试规范

- 测试文件: `__tests__/[name].test.ts`
- 测试覆盖: 核心功能必须有单元测试
- 运行命令: `npm test`

## 7. Git 提交规范

```
feat: 新功能
fix: 修复
docs: 文档
style: 格式
refactor: 重构
test: 测试
chore: 构建/工具
```

## 8. 禁止事项

- ❌ 不允许重复代码
- ❌ 不允许硬编码配置
- ❌ 不允许忽略错误处理
- ❌ 不允许提交敏感信息
- ❌ 不允许跳过类型检查
