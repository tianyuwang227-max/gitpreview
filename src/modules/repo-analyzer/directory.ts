import fs from 'fs/promises';
import path from 'path';
import { DirectoryInfo } from './types';
import { logger } from '../../utils/logger';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.svn', '__pycache__', 'venv', '.venv',
  'dist', 'build', '.next', '.nuxt', 'coverage', '.cache',
]);

const MAX_DEPTH = 3;
const MAX_ITEMS = 50;

export async function analyzeDirectory(repoPath: string): Promise<DirectoryInfo> {
  logger.info('Analyzing directory structure');

  const topLevelItems: string[] = [];
  let totalFiles = 0;
  let totalDirs = 0;

  try {
    const entries = await fs.readdir(repoPath);

    for (const entry of entries) {
      if (entry.startsWith('.') && entry !== '.github') continue;

      const fullPath = path.join(repoPath, entry);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        topLevelItems.push(entry + '/');
        totalDirs++;
      } else {
        topLevelItems.push(entry);
        totalFiles++;
      }
    }

    const tree = await buildTree(repoPath, '', 0);

    return {
      tree,
      totalFiles,
      totalDirs,
      topLevelItems: topLevelItems.sort(),
    };
  } catch (error) {
    logger.error('Failed to analyze directory', { error });
    return {
      tree: 'Error reading directory',
      totalFiles: 0,
      totalDirs: 0,
      topLevelItems: [],
    };
  }
}

async function buildTree(dirPath: string, prefix: string, depth: number): Promise<string> {
  if (depth >= MAX_DEPTH) return prefix + '...\n';

  let result = '';
  let itemCount = 0;

  try {
    const entries = await fs.readdir(dirPath);
    const sortedEntries = entries
      .filter(e => !e.startsWith('.') || e === '.github')
      .sort((a, b) => {
        const aIsDir = !a.includes('.');
        const bIsDir = !b.includes('.');
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      });

    for (const entry of sortedEntries) {
      if (itemCount >= MAX_ITEMS) {
        result += prefix + `... (${sortedEntries.length - MAX_ITEMS} more items)\n`;
        break;
      }

      const fullPath = path.join(dirPath, entry);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        if (IGNORE_DIRS.has(entry)) continue;

        result += prefix + entry + '/\n';
        result += await buildTree(fullPath, prefix + '  ', depth + 1);
      } else {
        result += prefix + entry + '\n';
      }

      itemCount++;
    }
  } catch (error) {
    // Permission error or other issues
  }

  return result;
}

export function formatTree(tree: string): string {
  return tree
    .split('\n')
    .map(line => {
      if (line.endsWith('/')) {
        return line.replace(/\/$/, '/');
      }
      return line;
    })
    .join('\n');
}
