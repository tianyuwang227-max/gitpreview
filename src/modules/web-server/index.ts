import http from 'http';
import { createServer } from './server';
import { setupGracefulShutdown } from '../../utils/shutdown';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export { createServer } from './server';
export type { ApiResponse, RepoPreviewRequest, RepoPreviewResponse } from './types';

export function startServer(port?: number) {
  const app = createServer();
  const serverPort = port || config.server.port;

  const server = http.createServer(app);

  setupGracefulShutdown(server);

  server.listen(serverPort, '127.0.0.1', () => {
    logger.info(`GitPreview server running on http://127.0.0.1:${serverPort}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}
