import axios from 'axios';
import { config } from '../../config';
import { RepoInfo } from './types';
import { logger } from '../../utils/logger';
import { createError, ErrorCode } from '../../utils/errors';

interface GitHubApiRepo {
  full_name: string;
  description: string;
  default_branch: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  size: number;
  html_url: string;
  archived: boolean;
  private: boolean;
  owner: {
    login: string;
  };
  name: string;
}

export async function fetchRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
  const url = `${config.github.apiBase}/repos/${owner}/${repo}`;

  logger.info(`Fetching repo info: ${owner}/${repo}`);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (config.github.token) {
      headers.Authorization = `token ${config.github.token}`;
    }

    const response = await axios.get<GitHubApiRepo>(url, { headers });
    const data = response.data;

    if (data.private) {
      throw createError(
        ErrorCode.REPO_PRIVATE,
        `Repository ${owner}/${repo} is private`,
        { owner, repo }
      );
    }

    if (data.archived) {
      logger.warn(`Repository ${owner}/${repo} is archived`);
    }

    return {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      url: data.html_url,
      description: data.description || '',
      defaultBranch: data.default_branch,
      language: data.language || 'Unknown',
      stars: data.stargazers_count,
      forks: data.forks_count,
      size: data.size,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AppError') {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw createError(
          ErrorCode.REPO_NOT_FOUND,
          `Repository ${owner}/${repo} not found`,
          { owner, repo, status: 404 }
        );
      }
      if (error.response?.status === 403) {
        throw createError(
          ErrorCode.GITHUB_RATE_LIMIT,
          'GitHub API rate limit exceeded. Set GITHUB_TOKEN to increase limit.',
          { retryAfter: error.response.headers['x-ratelimit-reset'] }
        );
      }
      throw createError(
        ErrorCode.GITHUB_API_ERROR,
        `GitHub API error: ${error.message}`,
        { status: error.response?.status }
      );
    }

    throw createError(
      ErrorCode.INTERNAL_ERROR,
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
