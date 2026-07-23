import fs from 'fs/promises';
import path from 'path';
import { ProjectConfig, PROJECT_DETECTION_RULES } from './types';
import { logger } from '../../utils/logger';

const FRAMEWORK_DETECTION: Record<string, Partial<ProjectConfig>> = {
  'react-scripts': {
    framework: 'react',
    startCommand: 'npm start',
    port: 3000,
  },
  'next': {
    framework: 'nextjs',
    startCommand: 'npm run dev',
    port: 3000,
  },
  'vue': {
    framework: 'vue',
    startCommand: 'npm run serve',
    port: 8080,
  },
  'nuxt': {
    framework: 'nuxt',
    startCommand: 'npm run dev',
    port: 3000,
  },
  'express': {
    framework: 'express',
    startCommand: 'npm start',
    port: 3000,
  },
  'flask': {
    framework: 'flask',
    startCommand: 'flask run',
    port: 5000,
  },
  'django': {
    framework: 'django',
    startCommand: 'python manage.py runserver',
    port: 8000,
  },
};

export async function detectProject(repoPath: string): Promise<ProjectConfig> {
  logger.info(`Detecting project type in ${repoPath}`);

  const files = await fs.readdir(repoPath);

  for (const [file, config] of Object.entries(PROJECT_DETECTION_RULES)) {
    if (files.includes(file)) {
      logger.info(`Detected ${config.type} project (found ${file})`);

      if (config.type === 'node') {
        const nodeConfig = await detectNodeFramework(repoPath);
        return { ...config, ...nodeConfig };
      }

      return config;
    }
  }

  logger.warn('Unknown project type, using defaults');
  return {
    type: 'unknown',
    port: 3000,
  };
}

async function detectNodeFramework(repoPath: string): Promise<Partial<ProjectConfig>> {
  try {
    const packageJsonPath = path.join(repoPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [framework, config] of Object.entries(FRAMEWORK_DETECTION)) {
      if (allDeps[framework]) {
        logger.info(`Detected framework: ${config.framework}`);
        return config;
      }
    }

    if (packageJson.scripts?.start) {
      return { startCommand: 'npm start' };
    }

    if (packageJson.scripts?.dev) {
      return { startCommand: 'npm run dev' };
    }

    if (packageJson.main) {
      return { startCommand: `node ${packageJson.main}` };
    }

    return {};
  } catch (error) {
    logger.error('Failed to parse package.json', { error });
    return {};
  }
}

export function generateDockerfile(config: ProjectConfig): string {
  switch (config.type) {
    case 'node':
      return generateNodeDockerfile(config);
    case 'python':
      return generatePythonDockerfile(config);
    case 'go':
      return generateGoDockerfile(config);
    case 'static':
      return generateStaticDockerfile();
    default:
      return generateNodeDockerfile(config);
  }
}

function generateNodeDockerfile(config: ProjectConfig): string {
  return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

${config.buildCommand ? `RUN ${config.buildCommand}` : ''}

EXPOSE ${config.port}

CMD ["sh", "-c", "${config.startCommand || 'npm start'}"]
`;
}

function generatePythonDockerfile(config: ProjectConfig): string {
  return `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE ${config.port}

CMD ["sh", "-c", "${config.startCommand || 'python app.py'}"]
`;
}

function generateGoDockerfile(config: ProjectConfig): string {
  return `FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.* ./
RUN go mod download

COPY . .
RUN go build -o app .

FROM alpine:latest
RUN apk --no-cache add ca-certificates

WORKDIR /app
COPY --from=builder /app/app .

EXPOSE ${config.port}

CMD ["./app"]
`;
}

function generateStaticDockerfile(): string {
  return `FROM nginx:alpine

COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;
}
