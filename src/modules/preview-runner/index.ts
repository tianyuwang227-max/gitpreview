import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { processManager } from './process-manager';
import { detectProjectConfig } from './detector';
import { PreviewInstance, PreviewResult, CleanupResult } from './types';
import { fetchRepoInfo } from '../github-repo-manager/fetcher';
import { cloneRepo } from '../github-repo-manager/cloner';
import { repoStorage } from '../github-repo-manager/storage';
import { logger } from '../../utils/logger';

export { processManager } from './process-manager';
export { detectProjectConfig } from './detector';
export { allocatePort, releasePort } from './port-manager';
export type {
  ProjectInfo,
  ProjectConfig,
  PreviewInstance,
  PreviewResult,
  CleanupResult,
} from './types';

export async function createPreview(url: string): Promise<PreviewResult> {
  const previewId = uuidv4();

  logger.info(`Creating preview ${previewId} for ${url}`);

  try {
    const urlMatch = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (!urlMatch) {
      return { success: false, error: 'Invalid GitHub URL', phase: 'validation' };
    }

    const [, owner, repo] = urlMatch;
    const repoFullName = `${owner}/${repo}`;

    logger.info(`Fetching repo info: ${repoFullName}`);
    const repoInfo = await fetchRepoInfo(owner, repo);

    logger.info(`Cloning repository: ${repoFullName}`);
    const cloneResult = await cloneRepo(repoInfo);
    const localPath = cloneResult.localPath;

    await repoStorage.save({
      url,
      fullName: repoFullName,
      localPath,
      clonedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      status: 'active',
    });

    logger.info(`Detecting project config: ${localPath}`);
    const projectConfig = await detectProjectConfig(localPath);

    if (projectConfig.type === 'unknown') {
      return {
        success: false,
        error: 'Unable to detect project type. Supported: Node.js, Python, Static HTML',
        phase: 'detection',
      };
    }

    logger.info(`Starting preview process: ${previewId}`);
    const instance = await processManager.startPreview(previewId, localPath, projectConfig);

    instance.repoFullName = repoFullName;

    return {
      success: true,
      instance,
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
}

export function getPreview(id: string): PreviewInstance | undefined {
  return processManager.getInstance(id);
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
        result.stopped.push(instance.id);
      } catch (error) {
        result.errors.push(`${instance.id}: ${error}`);
      }
    }
  }

  return result;
}
