import { createServer } from './server';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export { createServer } from './server';
export type { ApiResponse, RepoPreviewRequest, RepoPreviewResponse } from './types';

export function startServer(port?: number) {
  const app = createServer();
  const serverPort = port || config.server.port;

  return app.listen(serverPort, () => {
    logger.info(`GitPreview server running on port ${serverPort}`);
    logger.info(`http://localhost:${serverPort}`);
  });
}

if (require.main === module) {
  startServer();
}
