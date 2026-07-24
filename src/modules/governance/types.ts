export interface DiskUsage {
  totalMB: number;
  projectsMB: number;
  screenshotsMB: number;
  dataMB: number;
  availableMB: number;
  percentUsed: number;
}

export interface AccessStats {
  totalPreviews: number;
  activePreviews: number;
  totalRequests: number;
  uniqueVisitors: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface ResourceLimits {
  maxConcurrentPreviews: number;
  maxDiskUsageMB: number;
  maxPreviewDurationMs: number;
  maxIdleTimeMs: number;
  maxRequestsPerMinute: number;
  cleanupIntervalMs: number;
}

export interface GovernanceConfig {
  diskQuotaMB: number;
  autoCleanupEnabled: boolean;
  cleanupThresholdPercent: number;
  maxPreviewAge: number;
  rateLimitWindow: number;
  rateLimitMax: number;
}

export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  diskQuotaMB: 5000,
  autoCleanupEnabled: true,
  cleanupThresholdPercent: 80,
  maxPreviewAge: 3600000,
  rateLimitWindow: 60000,
  rateLimitMax: 60,
};

export interface Alert {
  id: string;
  type: 'disk' | 'concurrency' | 'error' | 'performance';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}
