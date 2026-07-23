export interface HistoryEntry {
  id: string;
  url: string;
  owner: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  visitedAt: string;
  previewType: 'screenshot' | 'live';
  thumbnailPath?: string;
}

export interface HistoryFilter {
  owner?: string;
  language?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface HistoryStats {
  totalVisits: number;
  uniqueProjects: number;
  topLanguages: { name: string; count: number }[];
  topOwners: { name: string; count: number }[];
  recentActivity: { date: string; count: number }[];
}
