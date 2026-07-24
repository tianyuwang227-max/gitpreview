import fs from 'fs/promises';
import path from 'path';
import { ProjectConfig, SUPPORTED_FRAMEWORKS } from './types';
import { logger } from '../../utils/logger';

export async function detectProjectConfig(repoPath: string): Promise<ProjectConfig> {
  logger.info(`Detecting project config in ${repoPath}`);

  const files = await fs.readdir(repoPath);

  if (files.includes('package.json')) {
    return detectNodeProject(repoPath);
  }

  if (files.includes('requirements.txt') || files.includes('Pipfile') || files.includes('pyproject.toml')) {
    return detectPythonProject(repoPath);
  }

  if (files.includes('index.html')) {
    return {
      type: 'static',
      packageManager: 'unknown',
      installCommand: '',
      buildCommand: null,
      startCommand: 'npx http-server .',
      port: 8080,
      outputDir: null,
      framework: null,
    };
  }

  return {
    type: 'unknown',
    packageManager: 'unknown',
    installCommand: '',
    buildCommand: null,
    startCommand: '',
    port: 3000,
    outputDir: null,
    framework: null,
  };
}

async function detectNodeProject(repoPath: string): Promise<ProjectConfig> {
  const packageJsonPath = path.join(repoPath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const packageManager = await detectPackageManager(repoPath);

  for (const [dep, config] of Object.entries(SUPPORTED_FRAMEWORKS)) {
    if (allDeps[dep]) {
      logger.info(`Detected framework: ${config.framework}`);

      const scripts = packageJson.scripts || {};

      let startCommand = config.startCommand;
      if (config.framework === 'vite' && scripts.preview) {
        startCommand = 'npm run preview';
      } else if (config.framework === 'react' && scripts.serve) {
        startCommand = 'npm run serve';
      }

      let buildCommand = config.buildCommand;
      if (scripts.build) {
        buildCommand = `${packageManager} run build`;
      }

      return {
        type: 'node',
        packageManager,
        installCommand: `${packageManager} install`,
        buildCommand: buildCommand ?? null,
        startCommand: startCommand ?? `${packageManager} start`,
        port: config.port || 3000,
        outputDir: config.outputDir ?? null,
        framework: config.framework ?? null,
      };
    }
  }

  const scripts = packageJson.scripts || {};
  let startCommand = 'npm start';
  if (scripts.dev) {
    startCommand = `${packageManager} run dev`;
  } else if (scripts.start) {
    startCommand = `${packageManager} start`;
  } else if (packageJson.main) {
    startCommand = `node ${packageJson.main}`;
  }

  return {
    type: 'node',
    packageManager,
    installCommand: `${packageManager} install`,
    buildCommand: scripts.build ? `${packageManager} run build` : null,
    startCommand,
    port: 3000,
    outputDir: null,
    framework: null,
  };
}

async function detectPackageManager(repoPath: string): Promise<'npm' | 'yarn' | 'pnpm'> {
  const files = await fs.readdir(repoPath);

  if (files.includes('yarn.lock')) return 'yarn';
  if (files.includes('pnpm-lock.yaml')) return 'pnpm';
  return 'npm';
}

async function detectPythonProject(repoPath: string): Promise<ProjectConfig> {
  const files = await fs.readdir(repoPath);

  if (files.includes('requirements.txt')) {
    return {
      type: 'python',
      packageManager: 'pip',
      installCommand: 'pip install -r requirements.txt',
      buildCommand: null,
      startCommand: 'python app.py',
      port: 5000,
      outputDir: null,
      framework: null,
    };
  }

  return {
    type: 'python',
    packageManager: 'pip',
    installCommand: 'pip install -r requirements.txt',
    buildCommand: null,
    startCommand: 'python app.py',
    port: 5000,
    outputDir: null,
    framework: null,
  };
}
