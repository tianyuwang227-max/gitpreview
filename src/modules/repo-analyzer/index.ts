import { analyzeReadme } from './readme';
import { analyzeDirectory } from './directory';
import { analyzeTechStack } from './techstack';
import { getRecentCommits, getLastUpdated } from './commits';
import { detectLicense } from './license';
import { RepoAnalysis } from './types';
import { logger } from '../../utils/logger';

export { analyzeReadme } from './readme';
export { analyzeDirectory } from './directory';
export { analyzeTechStack } from './techstack';
export { getRecentCommits } from './commits';
export { detectLicense } from './license';
export type {
  ReadmeInfo,
  DirectoryInfo,
  TechStack,
  LanguageInfo,
  CommitInfo,
  RepoAnalysis,
} from './types';

export async function analyzeRepo(repoPath: string): Promise<RepoAnalysis> {
  logger.info(`Analyzing repository: ${repoPath}`);

  const [readme, directory, techStack, recentCommits, license, lastUpdated] = await Promise.all([
    analyzeReadme(repoPath),
    analyzeDirectory(repoPath),
    analyzeTechStack(repoPath),
    getRecentCommits(repoPath),
    detectLicense(repoPath),
    getLastUpdated(repoPath),
  ]);

  return {
    readme,
    directory,
    techStack,
    recentCommits,
    license,
    lastUpdated,
  };
}
