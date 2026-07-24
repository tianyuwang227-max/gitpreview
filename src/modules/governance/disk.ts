import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DiskUsage } from './types';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export async function getDiskUsage(basePath: string): Promise<DiskUsage> {
  try {
    const stats = await getDirectorySize(basePath);
    const projects = await getDirectorySize(path.join(basePath, 'projects'));
    const screenshots = await getDirectorySize(path.join(basePath, 'projects', '.screenshots'));
    const data = await getDirectorySize(path.join(basePath, 'data'));

    const totalMB = stats.totalMB;
    const availableMB = await getAvailableDiskSpace();
    const percentUsed = availableMB > 0 ? (totalMB / (totalMB + availableMB)) * 100 : 100;

    return {
      totalMB,
      projectsMB: projects.totalMB,
      screenshotsMB: screenshots.totalMB,
      dataMB: data.totalMB,
      availableMB,
      percentUsed,
    };
  } catch (error) {
    logger.error('Failed to get disk usage', { error });
    return {
      totalMB: 0,
      projectsMB: 0,
      screenshotsMB: 0,
      dataMB: 0,
      availableMB: 0,
      percentUsed: 0,
    };
  }
}

async function getDirectorySize(dirPath: string): Promise<{ totalMB: number; fileCount: number }> {
  try {
    const stats = await execAsync(`du -sm "${dirPath}" 2>/dev/null || echo "0"`);
    const totalMB = parseInt(stats.stdout.split('\t')[0]) || 0;

    const countResult = await execAsync(`find "${dirPath}" -type f 2>/dev/null | wc -l`);
    const fileCount = parseInt(countResult.stdout.trim()) || 0;

    return { totalMB, fileCount };
  } catch {
    return { totalMB: 0, fileCount: 0 };
  }
}

async function getAvailableDiskSpace(): Promise<number> {
  try {
    const { stdout } = await execAsync("df -m / | tail -1 | awk '{print $4}'");
    return parseInt(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

export async function checkDiskQuota(quotaMB: number): Promise<{ allowed: boolean; currentMB: number; quotaMB: number }> {
  const usage = await getDiskUsage(process.cwd());
  return {
    allowed: usage.totalMB < quotaMB,
    currentMB: usage.totalMB,
    quotaMB,
  };
}

export async function cleanupOldFiles(basePath: string, maxAgeMs: number): Promise<{ cleaned: number; errors: string[] }> {
  const result: { cleaned: number; errors: string[] } = { cleaned: 0, errors: [] };

  try {
    const projectsDir = path.join(basePath, 'projects');
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

      const dirPath = path.join(projectsDir, entry.name);
      const stats = await fs.stat(dirPath);
      const age = Date.now() - stats.mtime.getTime();

      if (age > maxAgeMs) {
        try {
          await fs.rm(dirPath, { recursive: true, force: true });
          result.cleaned++;
          logger.info(`Cleaned old project: ${entry.name}`);
        } catch (error) {
          result.errors.push(`Failed to clean ${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  } catch (error) {
    result.errors.push(`Failed to read projects directory: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

export async function getProjectSize(projectPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`du -sm "${projectPath}" 2>/dev/null || echo "0"`);
    return parseInt(stdout.split('\t')[0]) || 0;
  } catch {
    return 0;
  }
}
