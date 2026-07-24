import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

collectDefaultMetrics({ register });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const previewCreated = new Counter({
  name: 'preview_created_total',
  help: 'Total number of previews created',
  labelNames: ['mode', 'status'],
  registers: [register],
});

export const previewDuration = new Histogram({
  name: 'preview_duration_seconds',
  help: 'Duration of preview creation in seconds',
  labelNames: ['mode'],
  buckets: [5, 10, 30, 60, 120, 300],
  registers: [register],
});

export const activePreviews = new Gauge({
  name: 'active_previews',
  help: 'Number of currently active previews',
  registers: [register],
});

export const wsConnections = new Gauge({
  name: 'ws_connections',
  help: 'Number of WebSocket connections',
  registers: [register],
});

export const diskUsageBytes = new Gauge({
  name: 'disk_usage_bytes',
  help: 'Disk usage in bytes',
  labelNames: ['type'],
  registers: [register],
});

export const taskQueueSize = new Gauge({
  name: 'task_queue_size',
  help: 'Number of tasks in queue',
  labelNames: ['status'],
  registers: [register],
});

export function observeHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
  httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);
  httpRequestTotal.labels(method, route, statusCode.toString()).inc();
}

export function recordPreviewCreated(mode: string, success: boolean): void {
  previewCreated.labels(mode, success ? 'success' : 'failure').inc();
}

export function observePreviewDuration(mode: string, duration: number): void {
  previewDuration.labels(mode).observe(duration);
}

export function setActivePreviews(count: number): void {
  activePreviews.set(count);
}

export function setWsConnections(count: number): void {
  wsConnections.set(count);
}

export function setDiskUsage(type: string, bytes: number): void {
  diskUsageBytes.labels(type).set(bytes);
}

export function setTaskQueueSize(status: string, count: number): void {
  taskQueueSize.labels(status).set(count);
}
