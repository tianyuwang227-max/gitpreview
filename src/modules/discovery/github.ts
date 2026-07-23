import axios from 'axios';
import { config } from '../../config';
import { Project, SearchResult, SortOption, OrderOption } from './types';
import { logger } from '../../utils/logger';

const GITHUB_API = config.github.apiBase;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (config.github.token) {
    headers.Authorization = `token ${config.github.token}`;
  }

  return headers;
}

function mapRepo(data: any): Project {
  return {
    id: data.id.toString(),
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    description: data.description || '',
    language: data.language || 'Unknown',
    stars: data.stargazers_count,
    forks: data.forks_count,
    watchers: data.watchers_count,
    url: data.html_url,
    homepage: data.homepage,
    topics: data.topics || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    pushedAt: data.pushed_at,
    size: data.size,
    defaultBranch: data.default_branch,
    license: data.license?.spdx_id,
    archived: data.archived,
    disabled: data.disabled,
  };
}

export async function searchProjects(
  query: string,
  page: number = 1,
  perPage: number = 30,
  sort?: SortOption,
  order: OrderOption = 'desc'
): Promise<SearchResult> {
  logger.info(`Searching projects: ${query}`);

  try {
    const response = await axios.get(`${GITHUB_API}/search/repositories`, {
      headers: getHeaders(),
      params: {
        q: query,
        page,
        per_page: perPage,
        sort,
        order,
      },
    });

    return {
      totalCount: response.data.total_count,
      projects: response.data.items.map(mapRepo),
      page,
      perPage,
    };
  } catch (error) {
    logger.error('Search failed', { error });
    throw new Error('Failed to search projects');
  }
}

export async function getTrending(
  language?: string,
  since: 'daily' | 'weekly' | 'monthly' = 'weekly'
): Promise<Project[]> {
  logger.info(`Getting trending projects: ${language || 'all'}`);

  const date = new Date();
  if (since === 'weekly') {
    date.setDate(date.getDate() - 7);
  } else if (since === 'monthly') {
    date.setMonth(date.getMonth() - 1);
  } else {
    date.setDate(date.getDate() - 1);
  }

  const dateStr = date.toISOString().split('T')[0];
  let query = `created:>${dateStr} stars:>100`;

  if (language) {
    query += ` language:${language}`;
  }

  const result = await searchProjects(query, 1, 20, 'stars', 'desc');
  return result.projects;
}

export async function getRepoDetails(owner: string, repo: string): Promise<Project> {
  logger.info(`Getting repo details: ${owner}/${repo}`);

  try {
    const response = await axios.get(`${GITHUB_API}/repos/${owner}/${repo}`, {
      headers: getHeaders(),
    });

    return mapRepo(response.data);
  } catch (error) {
    logger.error('Failed to get repo details', { error });
    throw new Error('Failed to get repository details');
  }
}

export async function getReposByTopic(topic: string, page: number = 1): Promise<SearchResult> {
  return searchProjects(`topic:${topic}`, page, 30, 'stars', 'desc');
}

export async function getReposByLanguage(language: string, page: number = 1): Promise<SearchResult> {
  return searchProjects(`language:${language}`, page, 30, 'stars', 'desc');
}
