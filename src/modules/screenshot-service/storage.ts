import fs from 'fs/promises';
import path from 'path';
import { config } from '../../config';
import { ScreenshotResult } from './types';
import { logger } from '../../utils/logger';

export interface ScreenshotRecord {
  url: string;
  imagePath: string;
  capturedAt: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    fileSize: number;
  };
}

export class ScreenshotStorage {
  private records: Map<string, ScreenshotRecord[]> = new Map();
  private initialized = false;
  private dataPath = path.join(config.clone.baseDir, '.screenshots', 'index.json');

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      const records = JSON.parse(data) as ScreenshotRecord[];
      for (const record of records) {
        const existing = this.records.get(record.url) || [];
        existing.push(record);
        this.records.set(record.url, existing);
      }
      logger.info(`Loaded ${records.length} screenshot records`);
    } catch {
      logger.info('No existing screenshot data found, starting fresh');
    }

    this.initialized = true;
  }

  async save(result: ScreenshotResult): Promise<void> {
    const record: ScreenshotRecord = {
      url: result.url,
      imagePath: result.imagePath,
      capturedAt: result.timestamp.toISOString(),
      metadata: result.metadata,
    };

    const existing = this.records.get(result.url) || [];
    existing.push(record);
    this.records.set(result.url, existing);

    await this.persist();
  }

  getLatest(url: string): ScreenshotRecord | undefined {
    const records = this.records.get(url);
    if (!records || records.length === 0) return undefined;
    return records[records.length - 1];
  }

  getAll(url: string): ScreenshotRecord[] {
    return this.records.get(url) || [];
  }

  async exists(url: string, maxAge?: number): Promise<boolean> {
    const record = this.getLatest(url);
    if (!record) return false;

    if (maxAge) {
      const capturedAt = new Date(record.capturedAt).getTime();
      const now = Date.now();
      if (now - capturedAt > maxAge) return false;
    }

    try {
      await fs.access(record.imagePath);
      return true;
    } catch {
      return false;
    }
  }

  private async persist(): Promise<void> {
    try {
      const allRecords = Array.from(this.records.values()).flat();
      const data = JSON.stringify(allRecords, null, 2);
      await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
      await fs.writeFile(this.dataPath, data, 'utf-8');
    } catch (error) {
      logger.error('Failed to persist screenshot data', { error });
    }
  }
}

export const screenshotStorage = new ScreenshotStorage();
