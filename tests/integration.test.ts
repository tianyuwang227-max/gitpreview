import { processGithubUrl } from '../src/modules/github-repo-manager';
import { repoStorage } from '../src/modules/github-repo-manager/storage';
import fs from 'fs/promises';
import path from 'path';

const TEST_REPO = 'https://github.com/octocat/Hello-World';
const TEST_DIR = path.join(__dirname, '..', 'projects');

describe('GitHub Repository Manager Integration', () => {
  afterAll(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
      await fs.rm(path.join(__dirname, '..', 'data', 'repos.json'), { force: true });
    } catch (error) {
      // ignore cleanup errors
    }
  });

  it('should clone a repository and save record', async () => {
    const result = await processGithubUrl(TEST_REPO);

    expect(result.success).toBe(true);
    expect(result.localPath).toBeDefined();
    expect(result.repo.fullName).toBe('octocat/Hello-World');
    expect(result.repo.owner).toBe('octocat');
    expect(result.repo.name).toBe('Hello-World');

    const stat = await fs.stat(result.localPath);
    expect(stat.isDirectory()).toBe(true);

    await repoStorage.init();
    expect(repoStorage.has('octocat/Hello-World')).toBe(true);
  }, 120000);

  it('should return existing clone on second call', async () => {
    const result = await processGithubUrl(TEST_REPO);

    expect(result.success).toBe(true);
    expect(result.localPath).toBeDefined();
  }, 30000);
});
