import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private history: PerformanceMetric[] = [];
  private maxHistory = 1000;

  start(name: string, metadata?: Record<string, any>): string {
    const id = `${name}_${Date.now()}`;
    this.metrics.set(id, {
      name,
      startTime: performance.now(),
      metadata,
    });
    return id;
  }

  end(id: string): number | null {
    const metric = this.metrics.get(id);
    if (!metric) return null;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    this.metrics.delete(id);
    this.history.push(metric);

    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    logger.debug(`Performance: ${metric.name} took ${metric.duration.toFixed(2)}ms`);
    return metric.duration;
  }

  getStats(name?: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    let metrics = this.history;

    if (name) {
      metrics = metrics.filter(m => m.name === name);
    }

    if (metrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const durations = metrics
      .map(m => m.duration || 0)
      .sort((a, b) => a - b);

    const count = durations.length;
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count,
      avg: sum / count,
      min: durations[0],
      max: durations[count - 1],
      p50: durations[Math.floor(count * 0.5)],
      p95: durations[Math.floor(count * 0.95)],
      p99: durations[Math.floor(count * 0.99)],
    };
  }

  getRecentMetrics(limit: number = 50): PerformanceMetric[] {
    return this.history.slice(-limit);
  }

  clear(): void {
    this.metrics.clear();
    this.history = [];
  }
}

export const perfMonitor = new PerformanceMonitor();

export function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const id = perfMonitor.start(name);
  return fn().finally(() => perfMonitor.end(id));
}

export function measureSync<T>(name: string, fn: () => T): T {
  const id = perfMonitor.start(name);
  try {
    return fn();
  } finally {
    perfMonitor.end(id);
  }
}
