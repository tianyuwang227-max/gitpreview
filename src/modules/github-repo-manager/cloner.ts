import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../../config';
import { RepoInfo, CloneResult } from './types';
import { logger } from '../../utils/logger';

export async function cloneRepo(repo: RepoInfo, shallow: boolean = true): Promise<CloneResult> {
  const localPath = path.join(config.clone.baseDir, repo.owner, repo.name);

  logger.info(`Cloning ${repo.fullName} to ${localPath}`);

  try {
    await fs.mkdir(path.dirname(localPath), { recursive: true });

    const exists = await checkDirectoryExists(localPath);
    if (exists) {
      logger.info(`Repository already exists at ${localPath}`);
      return {
        success: true,
        localPath,
        repo,
        clonedAt: new Date(),
      };
    }

    const git: SimpleGit = simpleGit({
      timeout: {
        block: config.clone.timeout,
      },
    });

    const cloneOptions: string[] = [];
    if (shallow) {
      cloneOptions.push('--depth', '1');
    }

    await git.clone(repo.url, localPath, cloneOptions);

    logger.info(`Successfully cloned ${repo.fullName}`);

    return {
      success: true,
      localPath,
      repo,
      clonedAt: new Date(),
    };
  } catch (error) {
    logger.error(`Failed to clone ${repo.fullName}`, { error });
    throw new Error(`Clone failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function checkDirectoryExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
