import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  github: {
    token: process.env.GITHUB_TOKEN || '',
    apiBase: 'https://api.github.com',
  },

  clone: {
    baseDir: process.env.CLONE_BASE_DIR || './projects',
    timeout: parseInt(process.env.CLONE_TIMEOUT || '60000', 10),
  },

  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: '127.0.0.1',
  },

  paths: {
    reposData: path.join(process.cwd(), 'data', 'repos.json'),
    favoritesData: path.join(process.cwd(), 'data', 'favorites.json'),
    trustedRepos: path.join(process.cwd(), '.gitpreview', 'trusted-repos.json'),
  },

  preview: {
    maxConcurrent: 1,
    maxTimeoutMs: 300000,
    maxIdleMs: 600000,
  },
};
