import { WebSocketManager } from '../src/modules/websocket/manager';
import { WebSocket } from 'ws';
import http from 'http';

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../src/utils/task-queue', () => ({
  taskQueue: {
    getStatus: jest.fn(),
    enqueue: jest.fn(),
    registerHandler: jest.fn(),
    getStats: jest.fn(),
  },
}));

const { taskQueue } = require('../src/utils/task-queue');

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let server: http.Server;

  beforeEach(() => {
    wsManager = new WebSocketManager();
    server = http.createServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    wsManager.close();
    server.close();
  });

  function addMockClient(clientId: string) {
    const mockWs = {
      readyState: 1, // WebSocket.OPEN
      send: jest.fn(),
    } as any;

    (wsManager as any).clients.set(clientId, {
      id: clientId,
      ws: mockWs,
      subscribedTasks: new Set(),
    });

    return mockWs;
  }

  describe('subscribe', () => {
    it('should subscribe client to task', () => {
      wsManager.init(server);
      addMockClient('client1');

      wsManager.subscribeToTask('client1', 'task1');

      expect(wsManager.getTaskSubscriberCount('task1')).toBe(1);
    });

    it('should not duplicate subscriptions', () => {
      wsManager.init(server);
      addMockClient('client1');

      wsManager.subscribeToTask('client1', 'task1');
      wsManager.subscribeToTask('client1', 'task1');

      expect(wsManager.getTaskSubscriberCount('task1')).toBe(1);
    });

    it('should unsubscribe client from task', () => {
      wsManager.init(server);
      addMockClient('client1');

      wsManager.subscribeToTask('client1', 'task1');
      expect(wsManager.getTaskSubscriberCount('task1')).toBe(1);

      wsManager.unsubscribeFromTask('client1', 'task1');
      expect(wsManager.getTaskSubscriberCount('task1')).toBe(0);
    });
  });

  describe('broadcastProgress', () => {
    it('should broadcast progress to subscribed clients', () => {
      wsManager.init(server);
      const mockWs = addMockClient('client1');

      (wsManager as any).taskSubscribers.set('task1', new Set(['client1']));
      (wsManager as any).clients.get('client1').subscribedTasks.add('task1');

      wsManager.broadcastProgress({
        taskId: 'task1',
        progress: 50,
        status: 'processing',
        message: 'Processing...',
      });

      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('progress');
      expect(sentMessage.progress).toBe(50);
      expect(sentMessage.taskId).toBe('task1');
    });

    it('should not broadcast to non-subscribed clients', () => {
      wsManager.init(server);
      const mockWs = addMockClient('client1');

      wsManager.broadcastProgress({
        taskId: 'task1',
        progress: 50,
        status: 'processing',
        message: 'Processing...',
      });

      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe('broadcastTaskCompleted', () => {
    it('should broadcast completion to subscribed clients', () => {
      wsManager.init(server);
      const mockWs = addMockClient('client1');

      (wsManager as any).taskSubscribers.set('task1', new Set(['client1']));
      (wsManager as any).clients.get('client1').subscribedTasks.add('task1');

      const result = { success: true };
      wsManager.broadcastTaskCompleted('task1', result);

      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('completed');
      expect(sentMessage.data).toEqual(result);
      expect(sentMessage.progress).toBe(100);
    });

    it('should cleanup task after completion', () => {
      wsManager.init(server);
      addMockClient('client1');

      (wsManager as any).taskSubscribers.set('task1', new Set(['client1']));
      (wsManager as any).clients.get('client1').subscribedTasks.add('task1');

      wsManager.broadcastTaskCompleted('task1', {});

      expect(wsManager.getTaskSubscriberCount('task1')).toBe(0);
    });
  });

  describe('broadcastTaskError', () => {
    it('should broadcast error to subscribed clients', () => {
      wsManager.init(server);
      const mockWs = addMockClient('client1');

      (wsManager as any).taskSubscribers.set('task1', new Set(['client1']));
      (wsManager as any).clients.get('client1').subscribedTasks.add('task1');

      wsManager.broadcastTaskError('task1', 'Something went wrong');

      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('error');
      expect(sentMessage.message).toBe('Something went wrong');
      expect(sentMessage.taskId).toBe('task1');
    });

    it('should cleanup task after error', () => {
      wsManager.init(server);
      addMockClient('client1');

      (wsManager as any).taskSubscribers.set('task1', new Set(['client1']));
      (wsManager as any).clients.get('client1').subscribedTasks.add('task1');

      wsManager.broadcastTaskError('task1', 'Error');

      expect(wsManager.getTaskSubscriberCount('task1')).toBe(0);
    });
  });

  describe('sendCurrentTaskStatus', () => {
    it('should send completed status for completed task', () => {
      wsManager.init(server);
      const mockWs = addMockClient('client1');

      taskQueue.getStatus.mockReturnValue({
        taskId: 'task1',
        type: 'test',
        status: 'completed',
        result: { success: true },
        progress: 100,
      });

      (wsManager as any).sendCurrentTaskStatus(mockWs, 'task1');

      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('completed');
      expect(sentMessage.data).toEqual({ success: true });
    });

    it('should send error status for failed task', () => {
      wsManager.init(server);
      const mockWs = addMockClient('client1');

      taskQueue.getStatus.mockReturnValue({
        taskId: 'task1',
        type: 'test',
        status: 'failed',
        error: 'Test error',
        progress: 0,
      });

      (wsManager as any).sendCurrentTaskStatus(mockWs, 'task1');

      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('error');
      expect(sentMessage.message).toBe('Test error');
    });

    it('should send progress for processing task', () => {
      wsManager.init(server);
      const mockWs = addMockClient('client1');

      taskQueue.getStatus.mockReturnValue({
        taskId: 'task1',
        type: 'test',
        status: 'processing',
        progress: 50,
      });

      (wsManager as any).sendCurrentTaskStatus(mockWs, 'task1');

      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('progress');
      expect(sentMessage.progress).toBe(50);
    });

    it('should not send if task not found', () => {
      wsManager.init(server);
      const mockWs = addMockClient('client1');

      taskQueue.getStatus.mockReturnValue(undefined);

      (wsManager as any).sendCurrentTaskStatus(mockWs, 'task1');

      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      wsManager.init(server);

      (wsManager as any).clients.set('client1', { id: 'client1' });
      (wsManager as any).clients.set('client2', { id: 'client2' });
      (wsManager as any).taskSubscribers.set('task1', new Set(['client1']));

      const stats = wsManager.getStats();
      expect(stats.connectedClients).toBe(2);
      expect(stats.activeTasks).toBe(1);
    });
  });
});
