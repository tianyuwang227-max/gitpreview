import fs from 'fs/promises';
import path from 'path';
import { HistoryEntry, HistoryFilter, HistoryStats } from './types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'history.json');
const MAX_HISTORY = 1000;

export class HistoryManager {
  private entries: HistoryEntry[] = [];
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await fs.readFile(HISTORY_FILE, 'utf-8');
      this.entries = JSON.parse(data);
      logger.info(`Loaded ${this.entries.length} history entries`);
    } catch {
      logger.info('No history found, starting fresh');
    }

    this.initialized = true;
  }

  async addEntry(entry: Omit<HistoryEntry, 'id' | 'visitedAt'>): Promise<HistoryEntry> {
    await this.init();

    const existingIndex = this.entries.findIndex(e => e.fullName === entry.fullName);

    const newEntry: HistoryEntry = {
      ...entry,
      id: this.generateId(),
      visitedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.entries.splice(existingIndex, 1);
    }

    this.entries.unshift(newEntry);

    if (this.entries.length > MAX_HISTORY) {
      this.entries = this.entries.slice(0, MAX_HISTORY);
    }

    await this.persist();
    return newEntry;
  }

  async getHistory(limit: number = 50, offset: number = 0): Promise<HistoryEntry[]> {
    await this.init();
    return this.entries.slice(offset, offset + limit);
  }

  async searchHistory(query: string): Promise<HistoryEntry[]> {
    await this.init();
    const lowerQuery = query.toLowerCase();

    return this.entries.filter(entry =>
      entry.fullName.toLowerCase().includes(lowerQuery) ||
      entry.description.toLowerCase().includes(lowerQuery) ||
      entry.language.toLowerCase().includes(lowerQuery)
    );
  }

  async filterHistory(filter: HistoryFilter): Promise<HistoryEntry[]> {
    await this.init();

    return this.entries.filter(entry => {
      if (filter.owner && entry.owner !== filter.owner) return false;
      if (filter.language && entry.language !== filter.language) return false;
      if (filter.dateFrom && entry.visitedAt < filter.dateFrom) return false;
      if (filter.dateTo && entry.visitedAt > filter.dateTo) return false;
      return true;
    });
  }

  async getStats(): Promise<HistoryStats> {
    await this.init();

    const languageCount: Record<string, number> = {};
    const ownerCount: Record<string, number> = {};
    const dateCount: Record<string, number> = {};

    for (const entry of this.entries) {
      languageCount[entry.language] = (languageCount[entry.language] || 0) + 1;
      ownerCount[entry.owner] = (ownerCount[entry.owner] || 0) + 1;

      const date = entry.visitedAt.split('T')[0];
      dateCount[date] = (dateCount[date] || 0) + 1;
    }

    const topLanguages = Object.entries(languageCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topOwners = Object.entries(ownerCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentActivity = Object.entries(dateCount)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    const uniqueProjects = new Set(this.entries.map(e => e.fullName)).size;

    return {
      totalVisits: this.entries.length,
      uniqueProjects,
      topLanguages,
      topOwners,
      recentActivity,
    };
  }

  async removeEntry(id: string): Promise<boolean> {
    await this.init();

    const index = this.entries.findIndex(e => e.id === id);
    if (index >= 0) {
      this.entries.splice(index, 1);
      await this.persist();
      return true;
    }
    return false;
  }

  async clearHistory(): Promise<void> {
    this.entries = [];
    await this.persist();
  }

  private generateId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async persist(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
      await fs.writeFile(HISTORY_FILE, JSON.stringify(this.entries, null, 2));
    } catch (error) {
      logger.error('Failed to persist history', { error });
    }
  }
}

export const historyManager = new HistoryManager();
