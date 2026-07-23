import { historyManager } from './storage';
import { HistoryEntry, HistoryFilter, HistoryStats } from './types';
import { logger } from '../../utils/logger';

export { historyManager } from './storage';
export type { HistoryEntry, HistoryFilter, HistoryStats } from './types';

export async function addToHistory(entry: Omit<HistoryEntry, 'id' | 'visitedAt'>): Promise<HistoryEntry> {
  return historyManager.addEntry(entry);
}

export async function getHistory(limit?: number, offset?: number): Promise<HistoryEntry[]> {
  return historyManager.getHistory(limit, offset);
}

export async function searchHistory(query: string): Promise<HistoryEntry[]> {
  return historyManager.searchHistory(query);
}

export async function filterHistory(filter: HistoryFilter): Promise<HistoryEntry[]> {
  return historyManager.filterHistory(filter);
}

export async function getHistoryStats(): Promise<HistoryStats> {
  return historyManager.getStats();
}

export async function removeFromHistory(id: string): Promise<boolean> {
  return historyManager.removeEntry(id);
}

export async function clearHistory(): Promise<void> {
  return historyManager.clearHistory();
}
