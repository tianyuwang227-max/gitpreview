import { ValidationResult } from './types';
import { createError, ErrorCode } from '../../utils/errors';

const GITHUB_URL_PATTERNS = [
  /^https?:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)\/?$/,
  /^git@github\.com:([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)\.git$/,
];

export function validateGithubUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();

  if (!trimmedUrl.includes('github.com')) {
    return { valid: false, error: 'Not a GitHub URL' };
  }

  for (const pattern of GITHUB_URL_PATTERNS) {
    const match = trimmedUrl.match(pattern);
    if (match) {
      return {
        valid: true,
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
      };
    }
  }

  return {
    valid: false,
    error: 'Invalid GitHub URL. Expected format: https://github.com/owner/repo',
  };
}

export function validateGithubUrlOrThrow(url: string): { owner: string; repo: string } {
  const result = validateGithubUrl(url);

  if (!result.valid) {
    if (!url.includes('github.com')) {
      throw createError(ErrorCode.NOT_GITHUB_URL, result.error!, { url });
    }
    throw createError(ErrorCode.INVALID_URL, result.error!, { url });
  }

  return { owner: result.owner!, repo: result.repo! };
}
