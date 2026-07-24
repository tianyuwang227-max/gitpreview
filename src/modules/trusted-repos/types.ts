export interface TrustedRepo {
  owner: string;
  repo: string;
  ref?: string;
  allowScripts: boolean;
  startCommand?: string | null;
  port?: number | null;
}

export interface TrustedReposConfig {
  repos: TrustedRepo[];
}
