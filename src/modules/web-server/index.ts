import http from 'http';
import { createServer } from './server';
import { initWebSocket } from '../websocket';
import { setupGracefulShutdown } from '../../utils/shutdown';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export { createServer } from './server';
export type { ApiResponse, RepoPreviewRequest, RepoPreviewResponse } from './types';

export function startServer(port?: number) {
  const app = createServer();
  const serverPort = port || config.server.port;

  const server = http.createServer(app);

  initWebSocket(server);
  setupGracefulShutdown(server);

  server.listen(serverPort, () => {
    logger.info(`GitPreview server running on port ${serverPort}`);
    logger.info(`http://localhost:${serverPort}`);
    logger.info(`WebSocket available at ws://localhost:${serverPort}/ws`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}
