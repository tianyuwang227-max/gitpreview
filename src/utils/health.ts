import { processManager } from '../modules/preview-runner/process-manager';
import { taskQueue } from './task-queue';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    memory: MemoryCheck;
    processes: ProcessCheck;
    tasks: TaskCheck;
  };
}

interface MemoryCheck {
  status: 'ok' | 'warning' | 'critical';
  heapUsedMB: number;
  heapTotalMB: number;
  percentUsed: number;
}

interface ProcessCheck {
  status: 'ok' | 'warning' | 'critical';
  running: number;
  max: number;
}

interface TaskCheck {
  status: 'ok' | 'warning' | 'critical';
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

const startTime = Date.now();

export async function getHealthStatus(): Promise<HealthStatus> {
  const memory = checkMemory();
  const processes = checkProcesses();
  const tasks = checkTasks();

  const statuses = [memory.status, processes.status, tasks.status];
  let overallStatus: HealthStatus['status'] = 'healthy';

  if (statuses.includes('critical')) {
    overallStatus = 'unhealthy';
  } else if (statuses.includes('warning')) {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: { memory, processes, tasks },
  };
}

function checkMemory(): MemoryCheck {
  const memUsage = process.memoryUsage();

  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const percentUsed = Math.round((heapUsedMB / heapTotalMB) * 100);

  let status: MemoryCheck['status'] = 'ok';
  if (percentUsed > 90) {
    status = 'critical';
  } else if (percentUsed > 80) {
    status = 'warning';
  }

  return {
    status,
    heapUsedMB,
    heapTotalMB,
    percentUsed,
  };
}

function checkProcesses(): ProcessCheck {
  const running = processManager.getRunningCount();
  const max = 1;

  let status: ProcessCheck['status'] = 'ok';
  if (running >= max) {
    status = 'warning';
  }

  return {
    status,
    running,
    max,
  };
}

function checkTasks(): TaskCheck {
  const stats = taskQueue.getStats();

  let status: TaskCheck['status'] = 'ok';
  if (stats.failed > 10) {
    status = 'warning';
  }

  return {
    status,
    pending: stats.pending,
    processing: stats.processing,
    completed: stats.completed,
    failed: stats.failed,
  };
}
