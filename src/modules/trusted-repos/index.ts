import fs from 'fs/promises';
import { TrustedRepo, TrustedReposConfig } from './types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

let cachedConfig: TrustedReposConfig | null = null;

export async function loadTrustedRepos(): Promise<TrustedReposConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const data = await fs.readFile(config.paths.trustedRepos, 'utf-8');
    cachedConfig = JSON.parse(data) as TrustedReposConfig;
    logger.info(`Loaded ${cachedConfig.repos.length} trusted repos`);
    return cachedConfig;
  } catch (error) {
    logger.warn('No trusted repos config found, using empty config');
    cachedConfig = { repos: [] };
    return cachedConfig;
  }
}

export function clearCache(): void {
  cachedConfig = null;
}

export async function isRepoTrusted(owner: string, repo: string): Promise<boolean> {
  const config = await loadTrustedRepos();
  return config.repos.some(r => r.owner === owner && r.repo === repo);
}

export async function getTrustedRepo(owner: string, repo: string): Promise<TrustedRepo | null> {
  const config = await loadTrustedRepos();
  return config.repos.find(r => r.owner === owner && r.repo === repo) || null;
}

export async function getAllTrustedRepos(): Promise<TrustedRepo[]> {
  const config = await loadTrustedRepos();
  return config.repos;
}
