import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { WebSocketMessage, WebSocketClient, ProgressUpdate } from './types';
import { logger } from '../../utils/logger';

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private taskSubscribers: Map<string, Set<string>> = new Map();

  init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        id: clientId,
        ws,
        subscribedTasks: new Set(),
      };

      this.clients.set(clientId, client);
      logger.info(`WebSocket client connected: ${clientId}`);

      this.sendMessage(ws, {
        type: 'connected',
        data: { clientId },
        timestamp: new Date().toISOString(),
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          logger.error('Invalid WebSocket message', { error });
        }
      });

      ws.on('close', () => {
        this.removeClient(clientId);
        logger.info(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}`, { error });
        this.removeClient(clientId);
      });
    });

    logger.info('WebSocket server initialized');
  }

  private handleMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        if (message.taskId) {
          this.subscribeToTask(clientId, message.taskId);
        }
        break;

      case 'unsubscribe':
        if (message.taskId) {
          this.unsubscribeFromTask(clientId, message.taskId);
        }
        break;

      case 'ping':
        this.sendMessage(client.ws, {
          type: 'progress',
          message: 'pong',
          timestamp: new Date().toISOString(),
        });
        break;
    }
  }

  subscribeToTask(clientId: string, taskId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscribedTasks.add(taskId);

    if (!this.taskSubscribers.has(taskId)) {
      this.taskSubscribers.set(taskId, new Set());
    }
    this.taskSubscribers.get(taskId)!.add(clientId);

    logger.info(`Client ${clientId} subscribed to task ${taskId}`);
  }

  unsubscribeFromTask(clientId: string, taskId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscribedTasks.delete(taskId);
    }

    const subscribers = this.taskSubscribers.get(taskId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.taskSubscribers.delete(taskId);
      }
    }
  }

  broadcastProgress(update: ProgressUpdate): void {
    const subscribers = this.taskSubscribers.get(update.taskId);
    if (!subscribers || subscribers.size === 0) return;

    const message: WebSocketMessage = {
      type: 'progress',
      taskId: update.taskId,
      progress: update.progress,
      message: update.message,
      data: { status: update.status },
      timestamp: new Date().toISOString(),
    };

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
      }
    }
  }

  broadcastTaskCompleted(taskId: string, result: any): void {
    const subscribers = this.taskSubscribers.get(taskId);
    if (!subscribers || subscribers.size === 0) return;

    const message: WebSocketMessage = {
      type: 'completed',
      taskId,
      data: result,
      progress: 100,
      timestamp: new Date().toISOString(),
    };

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
      }
    }

    this.cleanupTask(taskId);
  }

  broadcastTaskError(taskId: string, error: string): void {
    const subscribers = this.taskSubscribers.get(taskId);
    if (!subscribers || subscribers.size === 0) return;

    const message: WebSocketMessage = {
      type: 'error',
      taskId,
      message: error,
      timestamp: new Date().toISOString(),
    };

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
      }
    }

    this.cleanupTask(taskId);
  }

  private cleanupTask(taskId: string): void {
    const subscribers = this.taskSubscribers.get(taskId);
    if (subscribers) {
      for (const clientId of subscribers) {
        const client = this.clients.get(clientId);
        if (client) {
          client.subscribedTasks.delete(taskId);
        }
      }
      this.taskSubscribers.delete(taskId);
    }
  }

  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      for (const taskId of client.subscribedTasks) {
        const subscribers = this.taskSubscribers.get(taskId);
        if (subscribers) {
          subscribers.delete(clientId);
          if (subscribers.size === 0) {
            this.taskSubscribers.delete(taskId);
          }
        }
      }
      this.clients.delete(clientId);
    }
  }

  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      connectedClients: this.clients.size,
      activeTasks: this.taskSubscribers.size,
    };
  }

  close(): void {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      this.taskSubscribers.clear();
      logger.info('WebSocket server closed');
    }
  }
}

export const wsManager = new WebSocketManager();
