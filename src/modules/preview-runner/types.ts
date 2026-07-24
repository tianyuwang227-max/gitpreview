export interface ProjectInfo {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  url: string;
  defaultBranch: string;
}

export interface ProjectConfig {
  type: 'node' | 'python' | 'static' | 'unknown';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'unknown';
  installCommand: string;
  buildCommand: string | null;
  startCommand: string;
  port: number;
  outputDir: string | null;
  framework: string | null;
}

export interface PreviewInstance {
  id: string;
  repoFullName: string;
  localPath: string;
  port: number;
  url: string;
  status: 'starting' | 'running' | 'stopped' | 'failed';
  pid: number | null;
  startedAt: Date;
  lastAccessedAt: Date;
  timeout: number;
  idleTimeout: number;
  config: ProjectConfig;
  logs: string[];
}

export interface PreviewResult {
  success: boolean;
  instance?: PreviewInstance;
  error?: string;
  phase?: string;
}

export interface CleanupResult {
  stopped: string[];
  errors: string[];
}

export const SUPPORTED_FRAMEWORKS: Record<string, Partial<ProjectConfig>> = {
  'vite': {
    framework: 'vite',
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    port: 4173,
    outputDir: 'dist',
  },
  'react-scripts': {
    framework: 'react',
    buildCommand: 'npm run build',
    startCommand: 'npx serve -s build',
    port: 3000,
    outputDir: 'build',
  },
  'next': {
    framework: 'nextjs',
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    port: 3000,
    outputDir: '.next',
  },
  'vue': {
    framework: 'vue',
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    port: 4173,
    outputDir: 'dist',
  },
  'nuxt': {
    framework: 'nuxt',
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    port: 3000,
    outputDir: '.output',
  },
  'svelte': {
    framework: 'svelte',
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    port: 4173,
    outputDir: 'build',
  },
  'angular': {
    framework: 'angular',
    buildCommand: 'npm run build',
    startCommand: 'npx http-server dist',
    port: 4200,
    outputDir: 'dist',
  },
  'express': {
    framework: 'express',
    buildCommand: null,
    startCommand: 'npm start',
    port: 3000,
    outputDir: null,
  },
  'gatsby': {
    framework: 'gatsby',
    buildCommand: 'npm run build',
    startCommand: 'npm run serve',
    port: 9000,
    outputDir: 'public',
  },
};

export const DEFAULT_TIMEOUT = 300000;
export const DEFAULT_IDLE_TIMEOUT = 600000;
export const MIN_PORT = 10000;
export const MAX_PORT = 60000;
