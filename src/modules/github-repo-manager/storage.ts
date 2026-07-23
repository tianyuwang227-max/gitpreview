import fs from 'fs/promises';
import { config } from '../../config';
import { RepoRecord } from './types';
import { logger } from '../../utils/logger';

export class RepoStorage {
  private records: Map<string, RepoRecord> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await fs.readFile(config.paths.reposData, 'utf-8');
      const records = JSON.parse(data) as RepoRecord[];
      for (const record of records) {
        this.records.set(record.fullName, record);
      }
      logger.info(`Loaded ${records.length} repo records`);
    } catch (error) {
      logger.info('No existing repo data found, starting fresh');
    }

    this.initialized = true;
  }

  async save(record: RepoRecord): Promise<void> {
    this.records.set(record.fullName, record);
    await this.persist();
  }

  get(fullName: string): RepoRecord | undefined {
    return this.records.get(fullName);
  }

  getAll(): RepoRecord[] {
    return Array.from(this.records.values());
  }

  has(fullName: string): boolean {
    return this.records.has(fullName);
  }

  async updateLastAccessed(fullName: string): Promise<void> {
    const record = this.records.get(fullName);
    if (record) {
      record.lastAccessed = new Date().toISOString();
      await this.persist();
    }
  }

  async markDeleted(fullName: string): Promise<void> {
    const record = this.records.get(fullName);
    if (record) {
      record.status = 'deleted';
      await this.persist();
    }
  }

  private async persist(): Promise<void> {
    try {
      const data = JSON.stringify(Array.from(this.records.values()), null, 2);
      await fs.writeFile(config.paths.reposData, data, 'utf-8');
    } catch (error) {
      logger.error('Failed to persist repo data', { error });
    }
  }
}

export const repoStorage = new RepoStorage();
