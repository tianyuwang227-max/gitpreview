export interface Project {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  watchers: number;
  url: string;
  homepage?: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  size: number;
  defaultBranch: string;
  license?: string;
  archived: boolean;
  disabled: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
}

export interface SearchResult {
  totalCount: number;
  projects: Project[];
  page: number;
  perPage: number;
}

export interface FavoriteProject {
  project: Project;
  addedAt: string;
  notes?: string;
}

export interface DiscoveryState {
  trending: Project[];
  categories: Category[];
  favorites: FavoriteProject[];
  recentSearches: string[];
}

export type SortOption = 'stars' | 'forks' | 'updated' | 'created';
export type OrderOption = 'desc' | 'asc';
