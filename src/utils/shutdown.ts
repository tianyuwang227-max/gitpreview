import { logger } from './logger';
import { processManager } from '../modules/preview-runner/process-manager';
import { taskQueue } from './task-queue';

let isShuttingDown = false;

export function setupGracefulShutdown(server: any): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, 30000);

    try {
      logger.info('Stopping HTTP server...');
      await new Promise<void>((resolve, reject) => {
        server.close((err: Error | undefined) => {
          if (err) reject(err);
          else resolve();
        });
      });
      logger.info('HTTP server stopped');

      logger.info('Stopping all previews...');
      await processManager.stopAll();
      logger.info('All previews stopped');

      logger.info('Cleaning up task queue...');
      taskQueue.cleanup(0);
      logger.info('Task queue cleaned');

      clearTimeout(shutdownTimeout);
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    if (!isShuttingDown) {
      shutdown('uncaughtException');
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
  });
}

export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}
