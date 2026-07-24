import { validateGithubUrl } from '../src/modules/github-repo-manager/validator';
import { createPreview, stopPreview, getPreview } from '../src/modules/preview-runner';
import { isRepoTrusted } from '../src/modules/trusted-repos';
import { createServer, removeProxy } from '../src/modules/web-server/server';

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setViewport: jest.fn(),
      goto: jest.fn(),
      screenshot: jest.fn(),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}));

jest.mock('../src/modules/preview-runner/detector', () => ({
  detectProjectConfig: jest.fn().mockResolvedValue({
    type: 'node',
    packageManager: 'npm',
    installCommand: 'npm ci --ignore-scripts',
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    port: 3000,
    allowScripts: false,
  }),
}));

jest.mock('../src/modules/trusted-repos', () => ({
  isRepoTrusted: jest.fn(),
  getTrustedRepo: jest.fn(),
  loadTrustedRepos: jest.fn(),
  clearCache: jest.fn(),
  getAllTrustedRepos: jest.fn(),
}));

jest.mock('../src/modules/github-repo-manager/fetcher', () => ({
  fetchRepoInfo: jest.fn().mockResolvedValue({
    owner: 'test',
    name: 'repo',
    fullName: 'test/repo',
    url: 'https://github.com/test/repo',
    description: 'Test repo',
    defaultBranch: 'main',
    language: 'JavaScript',
    stars: 100,
    forks: 10,
    size: 1000,
  }),
}));

jest.mock('../src/modules/github-repo-manager/cloner', () => ({
  cloneRepo: jest.fn().mockResolvedValue({
    success: true,
    localPath: '/tmp/test-repo',
    repo: { fullName: 'test/repo' },
    clonedAt: new Date(),
  }),
  checkoutRef: jest.fn(),
}));

jest.mock('../src/modules/preview-runner/process-manager', () => ({
  processManager: {
    canStartNew: jest.fn().mockReturnValue(true),
    startPreview: jest.fn().mockResolvedValue({
      id: 'test-id',
      repoFullName: 'test/repo',
      localPath: '/tmp/test-repo',
      port: 3000,
      url: 'http://localhost:3000',
      status: 'running',
      pid: 12345,
      startedAt: new Date(),
      lastAccessedAt: new Date(),
      timeout: 300000,
      idleTimeout: 600000,
      config: { type: 'node', port: 3000 },
      logs: [],
    }),
    getInstance: jest.fn(),
    stopPreview: jest.fn(),
    on: jest.fn(),
  },
}));

describe('Preview Runner - Trust Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject non-trusted repos for live preview', async () => {
    (isRepoTrusted as jest.Mock).mockResolvedValue(false);

    const result = await createPreview('https://github.com/untrusted/repo');

    expect(result.success).toBe(false);
    expect(result.phase).toBe('trust_check');
    expect(result.error).toContain('not in trusted repos list');
  });

  it('should allow trusted repos for live preview', async () => {
    (isRepoTrusted as jest.Mock).mockResolvedValue(true);
    const { getTrustedRepo } = require('../src/modules/trusted-repos');
    (getTrustedRepo as jest.Mock).mockResolvedValue({
      owner: 'test',
      repo: 'repo',
      allowScripts: false,
    });

    const result = await createPreview('https://github.com/test/repo');

    expect(result.success).toBe(true);
    expect(result.instance).toBeDefined();
  });

  it('should use configured ref when available', async () => {
    (isRepoTrusted as jest.Mock).mockResolvedValue(true);
    const { getTrustedRepo } = require('../src/modules/trusted-repos');
    (getTrustedRepo as jest.Mock).mockResolvedValue({
      owner: 'test',
      repo: 'repo',
      ref: 'v1.0.0',
      allowScripts: false,
    });

    const { checkoutRef } = require('../src/modules/github-repo-manager/cloner');

    const result = await createPreview('https://github.com/test/repo');

    expect(checkoutRef).toHaveBeenCalledWith('/tmp/test-repo', 'v1.0.0');
    expect(result.success).toBe(true);
    expect(result.ref).toBe('v1.0.0');
  });

  it('should return error when checkout fails', async () => {
    (isRepoTrusted as jest.Mock).mockResolvedValue(true);
    const { getTrustedRepo } = require('../src/modules/trusted-repos');
    (getTrustedRepo as jest.Mock).mockResolvedValue({
      owner: 'test',
      repo: 'repo',
      ref: 'nonexistent-branch',
      allowScripts: false,
    });

    const { checkoutRef } = require('../src/modules/github-repo-manager/cloner');
    (checkoutRef as jest.Mock).mockRejectedValue(new Error('Branch not found'));

    const result = await createPreview('https://github.com/test/repo');

    expect(result.success).toBe(false);
    expect(result.phase).toBe('checkout');
    expect(result.error).toContain('nonexistent-branch');
  });

  it('should use default branch when ref not configured', async () => {
    (isRepoTrusted as jest.Mock).mockResolvedValue(true);
    const { getTrustedRepo } = require('../src/modules/trusted-repos');
    (getTrustedRepo as jest.Mock).mockResolvedValue({
      owner: 'test',
      repo: 'repo',
      allowScripts: false,
    });

    const { checkoutRef } = require('../src/modules/github-repo-manager/cloner');

    const result = await createPreview('https://github.com/test/repo');

    expect(checkoutRef).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.ref).toBe('main');
  });
});

describe('Preview Proxy', () => {
  it('should have removeProxy function', () => {
    expect(typeof removeProxy).toBe('function');
  });

  it('should create server with proxy route', () => {
    const app = createServer();
    expect(app).toBeDefined();
  });
});
