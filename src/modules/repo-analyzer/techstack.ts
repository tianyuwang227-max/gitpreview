import fs from 'fs/promises';
import path from 'path';
import { TechStack, LanguageInfo } from './types';
import { logger } from '../../utils/logger';

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.c': 'C',
  '.cpp': 'C++',
  '.cs': 'C#',
  '.php': 'PHP',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
};

const FRAMEWORK_INDICATORS: Record<string, string[]> = {
  'React': ['react', 'react-dom', 'react-scripts', 'next'],
  'Vue.js': ['vue', 'nuxt', '@vue/cli-service'],
  'Angular': ['@angular/core', '@angular/cli'],
  'Svelte': ['svelte', '@sveltejs/kit'],
  'Express': ['express'],
  'Fastify': ['fastify'],
  'NestJS': ['@nestjs/core'],
  'Django': ['django'],
  'Flask': ['flask'],
  'FastAPI': ['fastapi'],
  'Spring': ['spring-boot'],
  'Rails': ['rails'],
};

const TOOL_INDICATORS: Record<string, string[]> = {
  'Docker': ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
  'Webpack': ['webpack.config.js', 'webpack.config.ts'],
  'Vite': ['vite.config.js', 'vite.config.ts'],
  'ESLint': ['.eslintrc', '.eslintrc.js', '.eslintrc.json', 'eslint.config.js'],
  'Prettier': ['.prettierrc', '.prettierrc.js', 'prettier.config.js'],
  'Jest': ['jest.config.js', 'jest.config.ts'],
  'Vitest': ['vitest.config.js', 'vitest.config.ts'],
  'TypeScript': ['tsconfig.json'],
  'Tailwind': ['tailwind.config.js', 'tailwind.config.ts'],
};

const TESTING_FRAMEWORKS: Record<string, string[]> = {
  'Jest': ['jest'],
  'Vitest': ['vitest'],
  'Mocha': ['mocha'],
  'Jasmine': ['jasmine'],
  'Pytest': ['pytest'],
  'RSpec': ['rspec'],
};

export async function analyzeTechStack(repoPath: string): Promise<TechStack> {
  logger.info('Analyzing tech stack');

  const languages = await detectLanguages(repoPath);
  const packageJson = await readPackageJson(repoPath);
  const files = await getAllFiles(repoPath);

  const frameworks = detectFrameworks(packageJson, files);
  const tools = detectTools(files, packageJson);
  const packageManager = detectPackageManager(repoPath, files);
  const testingFrameworks = detectTestingFrameworks(packageJson);

  return {
    languages,
    frameworks,
    tools,
    packageManager,
    testingFrameworks,
  };
}

async function detectLanguages(repoPath: string): Promise<LanguageInfo[]> {
  const languageBytes: Record<string, number> = {};
  let totalBytes = 0;

  await walkDir(repoPath, async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const language = LANGUAGE_EXTENSIONS[ext];

    if (language) {
      try {
        const stat = await fs.stat(filePath);
        languageBytes[language] = (languageBytes[language] || 0) + stat.size;
        totalBytes += stat.size;
      } catch {
        // Skip files that can't be read
      }
    }
  });

  return Object.entries(languageBytes)
    .map(([name, bytes]) => ({
      name,
      percentage: Math.round((bytes / totalBytes) * 100),
      bytes,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5);
}

async function walkDir(dirPath: string, callback: (filePath: string) => Promise<void>): Promise<void> {
  const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__', 'venv']);

  try {
    const entries = await fs.readdir(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        if (!ignoreDirs.has(entry) && !entry.startsWith('.')) {
          await walkDir(fullPath, callback);
        }
      } else {
        await callback(fullPath);
      }
    }
  } catch {
    // Permission error
  }
}

async function readPackageJson(repoPath: string): Promise<any> {
  try {
    const content = await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function getAllFiles(repoPath: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(repoPath);
    for (const entry of entries) {
      const fullPath = path.join(repoPath, entry);
      const stat = await fs.stat(fullPath);
      if (!stat.isDirectory()) {
        files.push(entry);
      }
    }
  } catch {
    // Permission error
  }

  return files;
}

function detectFrameworks(packageJson: any, _files: string[]): string[] {
  const frameworks = new Set<string>();

  if (packageJson) {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [framework, indicators] of Object.entries(FRAMEWORK_INDICATORS)) {
      if (indicators.some(dep => allDeps[dep])) {
        frameworks.add(framework);
      }
    }
  }

  return Array.from(frameworks);
}

function detectTools(files: string[], packageJson: any): string[] {
  const tools = new Set<string>();

  for (const [tool, indicators] of Object.entries(TOOL_INDICATORS)) {
    if (indicators.some(indicator => files.includes(indicator))) {
      tools.add(tool);
    }
  }

  if (packageJson) {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (allDeps['tailwindcss']) tools.add('Tailwind');
    if (allDeps['eslint']) tools.add('ESLint');
    if (allDeps['prettier']) tools.add('Prettier');
  }

  return Array.from(tools);
}

function detectPackageManager(repoPath: string, files: string[]): string {
  if (files.includes('yarn.lock')) return 'Yarn';
  if (files.includes('pnpm-lock.yaml')) return 'pnpm';
  if (files.includes('package-lock.json')) return 'npm';
  if (files.includes('Pipfile.lock')) return 'Pipenv';
  if (files.includes('poetry.lock')) return 'Poetry';
  if (files.includes('go.sum')) return 'Go Modules';
  if (files.includes('Cargo.lock')) return 'Cargo';
  return 'Unknown';
}

function detectTestingFrameworks(packageJson: any): string[] {
  if (!packageJson) return [];

  const frameworks: string[] = [];
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const [framework, indicators] of Object.entries(TESTING_FRAMEWORKS)) {
    if (indicators.some(dep => allDeps[dep])) {
      frameworks.push(framework);
    }
  }

  return frameworks;
}
