import { AccessStats } from './types';
import { logger } from '../../utils/logger';

interface RequestRecord {
  timestamp: number;
  duration: number;
  success: boolean;
  ip?: string;
}

export class AccessTracker {
  private requests: RequestRecord[] = [];
  private visitors: Set<string> = new Set();
  private totalRequests = 0;
  private totalErrors = 0;

  recordRequest(duration: number, success: boolean, ip?: string): void {
    const now = Date.now();

    this.requests.push({
      timestamp: now,
      duration,
      success,
      ip,
    });

    this.totalRequests++;
    if (!success) this.totalErrors++;

    if (ip) {
      this.visitors.add(ip);
    }

    this.cleanup(now);
  }

  getStats(): AccessStats {
    const now = Date.now();
    const recentRequests = this.requests.filter(r => now - r.timestamp < 3600000);

    const avgResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / recentRequests.length
      : 0;

    const errorRate = this.totalRequests > 0
      ? (this.totalErrors / this.totalRequests) * 100
      : 0;

    return {
      totalPreviews: this.totalRequests,
      activePreviews: 0,
      totalRequests: this.totalRequests,
      uniqueVisitors: this.visitors.size,
      averageResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  getRecentRequests(minutes: number = 60): RequestRecord[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.requests.filter(r => r.timestamp > cutoff);
  }

  private cleanup(now: number): void {
    const cutoff = now - 86400000;
    this.requests = this.requests.filter(r => r.timestamp > cutoff);
  }
}

export const accessTracker = new AccessTracker();
