import { randomUUID } from 'crypto';
import { processManager } from './process-manager';
import { detectProjectConfig } from './detector';
import { PreviewInstance, PreviewResult, CleanupResult } from './types';
import { fetchRepoInfo } from '../github-repo-manager/fetcher';
import { cloneRepo, checkoutRef } from '../github-repo-manager/cloner';
import { repoStorage } from '../github-repo-manager/storage';
import { isRepoTrusted, getTrustedRepo } from '../trusted-repos';
import { validateGithubUrl } from '../github-repo-manager/validator';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { removeProxy } from '../web-server/server';

export { processManager } from './process-manager';
export { detectProjectConfig } from './detector';
export { allocatePort, releasePort } from './port-manager';
export type {
  ProjectConfig,
  PreviewInstance,
  PreviewResult,
  CleanupResult,
} from './types';

export async function createPreview(url: string): Promise<PreviewResult> {
  const validation = validateGithubUrl(url);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      phase: 'validation',
    };
  }

  const { owner, repo } = validation as { owner: string; repo: string };

  const trusted = await isRepoTrusted(owner, repo);
  if (!trusted) {
    return {
      success: false,
      error: `Repository ${owner}/${repo} is not in trusted repos list. Add it to .gitpreview/trusted-repos.json to enable live preview.`,
      phase: 'trust_check',
    };
  }

  if (!processManager.canStartNew()) {
    return {
      success: false,
      error: `Maximum concurrent previews reached (${config.preview.maxConcurrent}). Please try again later.`,
      phase: 'limit',
    };
  }

  const previewId = randomUUID();
  logger.info(`Creating preview ${previewId} for ${owner}/${repo}`);

  try {
    const repoInfo = await fetchRepoInfo(owner, repo);

    logger.info(`Cloning repository: ${owner}/${repo}`);
    const cloneResult = await cloneRepo(repoInfo);
    const localPath = cloneResult.localPath;

    const trustedRepo = await getTrustedRepo(owner, repo);
    let actualRef = repoInfo.defaultBranch;

    if (trustedRepo?.ref) {
      logger.info(`Checking out configured ref: ${trustedRepo.ref}`);
      try {
        await checkoutRef(localPath, trustedRepo.ref);
        actualRef = trustedRepo.ref;
      } catch (error) {
        return {
          success: false,
          error: `Failed to checkout ref "${trustedRepo.ref}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          phase: 'checkout',
        };
      }
    }

    await repoStorage.save({
      url,
      fullName: `${owner}/${repo}`,
      localPath,
      clonedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      status: 'active',
    });

    logger.info(`Detecting project config: ${localPath}`);
    const projectConfig = await detectProjectConfig(localPath);

    if (trustedRepo) {
      if (trustedRepo.allowScripts) {
        projectConfig.allowScripts = true;
        projectConfig.installCommand = projectConfig.installCommand.replace('--ignore-scripts', '');
      }
      if (trustedRepo.startCommand) {
        projectConfig.startCommand = trustedRepo.startCommand;
      }
      if (trustedRepo.port) {
        projectConfig.port = trustedRepo.port;
      }
    }

    if (projectConfig.type === 'unknown') {
      return {
        success: false,
        error: 'Unable to detect project type. Supported: Node.js, Python, Static HTML',
        phase: 'detection',
      };
    }

    logger.info(`Starting preview process: ${previewId}`);
    const instance = await processManager.startPreview(previewId, localPath, projectConfig);

    instance.repoFullName = `${owner}/${repo}`;

    processManager.on('stopped', (stoppedId: string) => {
      if (stoppedId === previewId) {
        removeProxy(previewId);
      }
    });

    return {
      success: true,
      instance,
      ref: actualRef,
    };
  } catch (error) {
    logger.error(`Preview creation failed: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      phase: 'execution',
    };
  }
}

export async function stopPreview(id: string): Promise<void> {
  await processManager.stopPreview(id);
  removeProxy(id);
}

export function getPreview(id: string): PreviewInstance | undefined {
  const instance = processManager.getInstance(id);
  if (instance) {
    processManager.touchPreview(id);
  }
  return instance;
}

export function getAllPreviews(): PreviewInstance[] {
  return processManager.getAllInstances();
}

export function getRunningPreviews(): PreviewInstance[] {
  return processManager.getRunningInstances();
}

export async function cleanupOldPreviews(maxAge: number = 3600000): Promise<CleanupResult> {
  const result: CleanupResult = { stopped: [], errors: [] };

  const instances = processManager.getAllInstances();
  const now = Date.now();

  for (const instance of instances) {
    const age = now - instance.startedAt.getTime();
    if (age > maxAge) {
      try {
        await processManager.stopPreview(instance.id);
        removeProxy(instance.id);
        result.stopped.push(instance.id);
      } catch (error) {
        result.errors.push(`${instance.id}: ${error}`);
      }
    }
  }

  return result;
}
