export interface Task {
  id: string;
  type: string;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  progress: number;
}

export interface TaskResult {
  taskId: string;
  type: string;
  status: Task['status'];
  result?: any;
  error?: string;
  progress: number;
}

type TaskHandler = (task: Task) => Promise<any>;

export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private handlers: Map<string, TaskHandler> = new Map();

  registerHandler(taskType: string, handler: TaskHandler): void {
    this.handlers.set(taskType, handler);
  }

  async enqueue(taskType: string, data: any): Promise<string> {
    const taskId = this.generateTaskId();
    const task: Task = {
      id: taskId,
      type: taskType,
      data: data,
      status: 'pending',
      createdAt: new Date(),
      progress: 0,
    };

    this.tasks.set(taskId, task);
    this.processTask(taskId);

    return taskId;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getStatus(taskId: string): TaskResult | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    return {
      taskId: task.id,
      type: task.type,
      status: task.status,
      result: task.result,
      error: task.error,
      progress: task.progress,
    };
  }

  updateProgress(taskId: string, progress: number): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.progress = progress;
    }
  }

  private async processTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const handler = this.handlers.get(task.type);
    if (!handler) {
      task.status = 'failed';
      task.error = `No handler for task type: ${task.type}`;
      task.completedAt = new Date();
      return;
    }

    task.status = 'processing';
    task.startedAt = new Date();
    task.progress = 10;

    try {
      const result = await handler(task);
      task.status = 'completed';
      task.result = result;
      task.progress = 100;
      task.completedAt = new Date();
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.completedAt = new Date();
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  }

  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [id, task] of this.tasks.entries()) {
      if (task.completedAt && now - task.completedAt.getTime() > maxAge) {
        this.tasks.delete(id);
      }
    }
  }
}

export const taskQueue = new TaskQueue();
