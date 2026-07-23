import simpleGit from 'simple-git';
import { CommitInfo } from './types';
import { logger } from '../../utils/logger';

export async function getRecentCommits(repoPath: string, count: number = 5): Promise<CommitInfo[]> {
  logger.info('Getting recent commits');

  try {
    const git = simpleGit(repoPath);
    const log = await git.log({ maxCount: count });

    return log.all.map(commit => ({
      hash: commit.hash.substring(0, 7),
      message: commit.message.split('\n')[0].substring(0, 100),
      author: commit.author_name,
      date: commit.date,
    }));
  } catch (error) {
    logger.error('Failed to get commits', { error });
    return [];
  }
}

export async function getLastUpdated(repoPath: string): Promise<string> {
  try {
    const commits = await getRecentCommits(repoPath, 1);
    return commits.length > 0 ? commits[0].date : new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}
