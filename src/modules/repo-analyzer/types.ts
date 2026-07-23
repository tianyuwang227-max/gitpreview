export interface ReadmeInfo {
  content: string;
  summary: string;
  hasImages: boolean;
  hasBadges: boolean;
  sections: ReadmeSection[];
}

export interface ReadmeSection {
  title: string;
  level: number;
  content: string;
}

export interface DirectoryInfo {
  tree: string;
  totalFiles: number;
  totalDirs: number;
  topLevelItems: string[];
}

export interface TechStack {
  languages: LanguageInfo[];
  frameworks: string[];
  tools: string[];
  packageManager: string;
  testingFrameworks: string[];
}

export interface LanguageInfo {
  name: string;
  percentage: number;
  bytes: number;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface RepoAnalysis {
  readme: ReadmeInfo;
  directory: DirectoryInfo;
  techStack: TechStack;
  recentCommits: CommitInfo[];
  license: string;
  lastUpdated: string;
}
