export type ProjectType = 'node' | 'python' | 'go' | 'static' | 'unknown';

export interface ProjectConfig {
  type: ProjectType;
  framework?: string;
  buildCommand?: string;
  startCommand?: string;
  port: number;
  dockerfile?: string;
}

export interface DockerBuildOptions {
  repoPath: string;
  imageName: string;
  config: ProjectConfig;
  timeout?: number;
}

export interface DockerRunOptions {
  imageName: string;
  containerName: string;
  port: number;
  timeout?: number;
  env?: Record<string, string>;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  port: number;
  url: string;
  startedAt: Date;
}

export interface DockerResult {
  success: boolean;
  container?: ContainerInfo;
  error?: string;
  logs?: string;
}

export const PROJECT_DETECTION_RULES: Record<string, ProjectConfig> = {
  'package.json': {
    type: 'node',
    port: 3000,
    buildCommand: 'npm install',
    startCommand: 'npm start',
  },
  'requirements.txt': {
    type: 'python',
    port: 5000,
    buildCommand: 'pip install -r requirements.txt',
    startCommand: 'python app.py',
  },
  'go.mod': {
    type: 'go',
    port: 8080,
    buildCommand: 'go build',
    startCommand: './app',
  },
  'index.html': {
    type: 'static',
    port: 80,
  },
};
