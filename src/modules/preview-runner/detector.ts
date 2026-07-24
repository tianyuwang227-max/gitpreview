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
      allowScripts: false,
    };
  }

  return {
    type: 'unknown',
    packageManager: 'unknown',
    installCommand: '',
    buildCommand: null,
    startCommand: '',
    port: 3000,
    allowScripts: false,
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
      logger.info(`Detected framework: ${dep}`);

      return {
        type: 'node',
        packageManager,
        installCommand: `${packageManager} ci --ignore-scripts`,
        buildCommand: config.buildCommand || null,
        startCommand: config.startCommand || `${packageManager} start`,
        port: config.port || 3000,
        allowScripts: false,
      };
    }
  }

  return {
    type: 'node',
    packageManager,
    installCommand: `${packageManager} ci --ignore-scripts`,
    buildCommand: packageJson.scripts?.build ? `${packageManager} run build` : null,
    startCommand: packageJson.scripts?.start ? `${packageManager} start` : `node ${packageJson.main || 'index.js'}`,
    port: 3000,
    allowScripts: false,
  };
}

async function detectPackageManager(repoPath: string): Promise<'npm' | 'yarn' | 'pnpm'> {
  const files = await fs.readdir(repoPath);

  if (files.includes('yarn.lock')) return 'yarn';
  if (files.includes('pnpm-lock.yaml')) return 'pnpm';
  return 'npm';
}

async function detectPythonProject(_repoPath: string): Promise<ProjectConfig> {
  return {
    type: 'python',
    packageManager: 'pip',
    installCommand: 'pip install -r requirements.txt',
    buildCommand: null,
    startCommand: 'python app.py',
    port: 5000,
    allowScripts: false,
  };
}
