export interface ProjectConfig {
  type: 'node' | 'python' | 'static' | 'unknown';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'unknown';
  installCommand: string;
  buildCommand: string | null;
  startCommand: string;
  port: number;
  allowScripts: boolean;
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
  ref?: string;
}

export interface CleanupResult {
  stopped: string[];
  errors: string[];
}

export const SUPPORTED_FRAMEWORKS: Record<string, Partial<ProjectConfig>> = {
  'vite': {
    type: 'node',
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    port: 4173,
  },
  'react-scripts': {
    type: 'node',
    buildCommand: 'npm run build',
    startCommand: 'npx serve -s build',
    port: 3000,
  },
  'next': {
    type: 'node',
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    port: 3000,
  },
  'vue': {
    type: 'node',
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    port: 4173,
  },
  'express': {
    type: 'node',
    buildCommand: null,
    startCommand: 'npm start',
    port: 3000,
  },
};

export const DEFAULT_TIMEOUT = 300000;
export const DEFAULT_IDLE_TIMEOUT = 600000;
export const MIN_PORT = 10000;
export const MAX_PORT = 60000;
