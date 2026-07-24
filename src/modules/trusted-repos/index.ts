import fs from 'fs/promises';
import path from 'path';
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
  const cfg = await loadTrustedRepos();
  return cfg.repos.some(r => r.owner === owner && r.repo === repo);
}

export async function getTrustedRepo(owner: string, repo: string): Promise<TrustedRepo | null> {
  const cfg = await loadTrustedRepos();
  return cfg.repos.find(r => r.owner === owner && r.repo === repo) || null;
}

export async function getAllTrustedRepos(): Promise<TrustedRepo[]> {
  const cfg = await loadTrustedRepos();
  return cfg.repos;
}

export async function addTrustedRepo(repo: TrustedRepo): Promise<void> {
  const cfg = await loadTrustedRepos();

  const exists = cfg.repos.some(r => r.owner === repo.owner && r.repo === repo.repo);
  if (exists) {
    logger.info(`Repo ${repo.owner}/${repo.repo} already trusted`);
    return;
  }

  cfg.repos.push(repo);
  cachedConfig = cfg;

  await fs.mkdir(path.dirname(config.paths.trustedRepos), { recursive: true });
  await fs.writeFile(config.paths.trustedRepos, JSON.stringify(cfg, null, 2));

  logger.info(`Added trusted repo: ${repo.owner}/${repo.repo}`);
}
