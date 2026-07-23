import { screenshotStorage } from '../src/modules/screenshot-service/storage';
import fs from 'fs/promises';
import path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'projects', '.screenshots');

describe('Screenshot Storage', () => {
  beforeAll(async () => {
    await screenshotStorage.init();
  });

  afterAll(async () => {
    try {
      await fs.rm(SCREENSHOTS_DIR, { recursive: true, force: true });
    } catch (error) {
      // ignore cleanup errors
    }
  });

  it('should save and retrieve screenshot record', async () => {
    const mockResult = {
      success: true,
      imagePath: '/tmp/test.png',
      url: 'https://github.com/test/repo',
      timestamp: new Date(),
      metadata: {
        width: 1280,
        height: 800,
        format: 'png',
        fileSize: 12345,
      },
    };

    await screenshotStorage.save(mockResult);

    const record = screenshotStorage.getLatest('https://github.com/test/repo');
    expect(record).toBeDefined();
    expect(record?.url).toBe('https://github.com/test/repo');
    expect(record?.imagePath).toBe('/tmp/test.png');
  });

  it('should check if screenshot exists', async () => {
    const exists = await screenshotStorage.exists('https://github.com/test/repo');
    expect(exists).toBe(false);
  });

  it('should return undefined for non-existent url', () => {
    const record = screenshotStorage.getLatest('https://github.com/nonexistent/repo');
    expect(record).toBeUndefined();
  });
});
