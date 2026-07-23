import { TaskQueue } from '../src/utils/task-queue';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it('should enqueue a task', async () => {
    queue.registerHandler('test', async () => 'result');

    const taskId = await queue.enqueue('test', { data: 'test' });

    expect(taskId).toBeDefined();
    expect(taskId).toMatch(/^task_/);
  });

  it('should process task and return result', async () => {
    queue.registerHandler('test', async (task) => {
      return { processed: true, data: task.data };
    });

    const taskId = await queue.enqueue('test', { value: 42 });

    await new Promise(resolve => setTimeout(resolve, 100));

    const status = queue.getStatus(taskId);
    expect(status).toBeDefined();
    expect(status!.status).toBe('completed');
    expect(status!.result).toEqual({ processed: true, data: { value: 42 } });
  });

  it('should handle task failure', async () => {
    queue.registerHandler('test', async () => {
      throw new Error('Test error');
    });

    const taskId = await queue.enqueue('test', {});

    await new Promise(resolve => setTimeout(resolve, 100));

    const status = queue.getStatus(taskId);
    expect(status).toBeDefined();
    expect(status!.status).toBe('failed');
    expect(status!.error).toBe('Test error');
  });

  it('should update progress', async () => {
    queue.registerHandler('test', async (task) => {
      queue.updateProgress(task.id, 50);
      return 'done';
    });

    const taskId = await queue.enqueue('test', {});

    await new Promise(resolve => setTimeout(resolve, 100));

    const status = queue.getStatus(taskId);
    expect(status).toBeDefined();
    expect(status!.progress).toBe(100);
  });

  it('should return stats', async () => {
    queue.registerHandler('test', async () => 'result');

    await queue.enqueue('test', {});
    await queue.enqueue('test', {});

    const stats = queue.getStats();
    expect(stats.total).toBe(2);
  });
});
