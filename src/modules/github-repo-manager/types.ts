export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string;
  defaultBranch: string;
  language: string;
  stars: number;
  forks: number;
  size: number;
}

export interface CloneResult {
  success: boolean;
  localPath: string;
  repo: RepoInfo;
  clonedAt: Date;
}

export interface RepoRecord {
  url: string;
  fullName: string;
  localPath: string;
  clonedAt: string;
  lastAccessed: string;
  status: 'active' | 'deleted';
}

export interface ValidationResult {
  valid: boolean;
  owner?: string;
  repo?: string;
  error?: string;
}
