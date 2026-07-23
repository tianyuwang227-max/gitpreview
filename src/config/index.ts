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
    host: process.env.HOST || '0.0.0.0',
    cors: process.env.CORS_ORIGIN || '*',
  },

  paths: {
    reposData: path.join(process.cwd(), 'data', 'repos.json'),
    favoritesData: path.join(process.cwd(), 'data', 'favorites.json'),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600000', 10),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
  },

  puppeteer: {
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    timeout: parseInt(process.env.PUPPETEER_TIMEOUT || '30000', 10),
  },
};
