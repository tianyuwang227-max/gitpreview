import { Server } from 'http';
import { wsManager } from './manager';
import { logger } from '../../utils/logger';

export { wsManager } from './manager';
export type { WebSocketMessage, ProgressUpdate, WebSocketClient } from './types';

export function initWebSocket(server: Server): void {
  wsManager.init(server);
  logger.info('WebSocket module initialized');
}

export function sendProgress(taskId: string, progress: number, message: string): void {
  wsManager.broadcastProgress({
    taskId,
    progress,
    status: 'processing',
    message,
  });
}

export function sendCompleted(taskId: string, result: any): void {
  wsManager.broadcastTaskCompleted(taskId, result);
}

export function sendError(taskId: string, error: string): void {
  wsManager.broadcastTaskError(taskId, error);
}
