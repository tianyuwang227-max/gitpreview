import { getDiskUsage, checkDiskQuota, getProjectSize } from '../src/modules/governance/disk';
import { accessTracker } from '../src/modules/governance/access';
import { governanceManager } from '../src/modules/governance/manager';
import fs from 'fs/promises';
import path from 'path';

describe('Governance Module', () => {
  afterAll(() => {
    governanceManager.stop();
  });

  describe('Disk Utils', () => {
    it('should get disk usage', async () => {
      const usage = await getDiskUsage(process.cwd());

      expect(usage).toHaveProperty('totalMB');
      expect(usage).toHaveProperty('projectsMB');
      expect(usage).toHaveProperty('availableMB');
      expect(usage.totalMB).toBeGreaterThanOrEqual(0);
    });

    it('should check disk quota', async () => {
      const result = await checkDiskQuota(10000);

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('currentMB');
      expect(result).toHaveProperty('quotaMB');
      expect(result.quotaMB).toBe(10000);
    });

    it('should get project size', async () => {
      const testDir = path.join(__dirname, 'temp-governance');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'test.txt'), 'test content');

      const size = await getProjectSize(testDir);
      expect(size).toBeGreaterThanOrEqual(0);

      await fs.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('Access Tracker', () => {
    it('should record requests', () => {
      accessTracker.recordRequest(100, true, '127.0.0.1');
      accessTracker.recordRequest(200, true, '127.0.0.1');
      accessTracker.recordRequest(150, false, '192.168.1.1');

      const stats = accessTracker.getStats();

      expect(stats.totalRequests).toBeGreaterThanOrEqual(3);
      expect(stats.uniqueVisitors).toBeGreaterThanOrEqual(2);
      expect(stats.errorRate).toBeGreaterThan(0);
    });

    it('should calculate average response time', () => {
      accessTracker.recordRequest(100, true);
      accessTracker.recordRequest(200, true);

      const stats = accessTracker.getStats();
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });

    it('should get recent requests', () => {
      const recent = accessTracker.getRecentRequests(60);
      expect(Array.isArray(recent)).toBe(true);
    });
  });

  describe('Governance Manager', () => {
    it('should check rate limit', async () => {
      const result = await governanceManager.checkRateLimit('test-ip');

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
    });

    it('should check resources', async () => {
      const result = await governanceManager.checkResources();

      expect(result).toHaveProperty('diskOk');
      expect(result).toHaveProperty('concurrencyOk');
      expect(result).toHaveProperty('alerts');
    });

    it('should get config', () => {
      const config = governanceManager.getConfig();

      expect(config).toHaveProperty('diskQuotaMB');
      expect(config).toHaveProperty('autoCleanupEnabled');
      expect(config).toHaveProperty('maxPreviewAge');
      expect(config).toHaveProperty('rateLimitMax');
    });

    it('should get alerts', () => {
      const alerts = governanceManager.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should perform cleanup', async () => {
      const result = await governanceManager.performCleanup();

      expect(result).toHaveProperty('cleaned');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
