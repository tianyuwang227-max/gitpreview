# GitPreview

Preview GitHub projects without manual deployment.

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development
npm run dev
```

## Usage

```typescript
import { processGithubUrl } from './src/modules/github-repo-manager';

const result = await processGithubUrl('https://github.com/facebook/react');
console.log(result);
```

## Project Structure

```
gitpreview/
├── src/
│   ├── modules/
│   │   └── github-repo-manager/   # GitHub repo management
│   ├── config/                    # Configuration
│   └── utils/                     # Utilities
├── projects/                      # Cloned repos (gitignored)
├── data/                          # Data storage
└── tests/                         # Tests
```

## Documentation

- [Project Rules](PROJECT_RULES.md)
- [GitHub Repo Manager](src/modules/github-repo-manager/README.md)
