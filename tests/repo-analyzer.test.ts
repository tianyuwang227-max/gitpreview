import { analyzeReadme } from '../src/modules/repo-analyzer/readme';
import { analyzeDirectory } from '../src/modules/repo-analyzer/directory';
import { detectLicense } from '../src/modules/repo-analyzer/license';
import fs from 'fs/promises';
import path from 'path';

describe('Repo Analyzer', () => {
  const testDir = path.join(__dirname, 'temp-repo');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'README.md'), '# Test Project\n\nThis is a test project.\n\n## Installation\n\nnpm install');
    await fs.writeFile(path.join(testDir, 'LICENSE'), 'MIT License\n\nPermission is hereby granted...');
    await fs.writeFile(path.join(testDir, 'src', 'index.ts'), 'console.log("hello")');
    await fs.writeFile(path.join(testDir, 'package.json'), '{}');
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should analyze README', async () => {
    const readme = await analyzeReadme(testDir);

    expect(readme.content).toContain('# Test Project');
    expect(readme.summary).toBeDefined();
    expect(readme.sections.length).toBeGreaterThan(0);
  });

  it('should analyze directory', async () => {
    const directory = await analyzeDirectory(testDir);

    expect(directory.totalFiles).toBeGreaterThan(0);
    expect(directory.totalDirs).toBeGreaterThan(0);
    expect(directory.tree).toBeDefined();
  });

  it('should detect MIT license', async () => {
    const license = await detectLicense(testDir);
    expect(license).toBe('MIT');
  });
});
