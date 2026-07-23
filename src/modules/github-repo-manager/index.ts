import { validateGithubUrl } from './validator';
import { fetchRepoInfo } from './fetcher';
import { cloneRepo } from './cloner';
import { repoStorage } from './storage';
import { CloneResult } from './types';
import { logger } from '../../utils/logger';

export { validateGithubUrl } from './validator';
export { fetchRepoInfo } from './fetcher';
export { cloneRepo } from './cloner';
export { repoStorage } from './storage';
export type { RepoInfo, CloneResult, RepoRecord, ValidationResult } from './types';

export async function processGithubUrl(url: string): Promise<CloneResult> {
  logger.info(`Processing GitHub URL: ${url}`);

  const validation = validateGithubUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { owner, repo } = validation as { owner: string; repo: string };

  await repoStorage.init();

  const existing = repoStorage.get(`${owner}/${repo}`);
  if (existing && existing.status === 'active') {
    logger.info(`Found existing clone for ${owner}/${repo}`);
    await repoStorage.updateLastAccessed(`${owner}/${repo}`);
    return {
      success: true,
      localPath: existing.localPath,
      repo: await fetchRepoInfo(owner, repo),
      clonedAt: new Date(existing.clonedAt),
    };
  }

  const repoInfo = await fetchRepoInfo(owner, repo);
  const result = await cloneRepo(repoInfo);

  await repoStorage.save({
    url,
    fullName: repoInfo.fullName,
    localPath: result.localPath,
    clonedAt: result.clonedAt.toISOString(),
    lastAccessed: new Date().toISOString(),
    status: 'active',
  });

  return result;
}
