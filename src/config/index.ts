import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
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
  },
  paths: {
    reposData: path.join(process.cwd(), 'data', 'repos.json'),
  },
};
