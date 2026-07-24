import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Alert, GovernanceConfig, DEFAULT_GOVERNANCE_CONFIG } from './types';
import { getDiskUsage, checkDiskQuota, cleanupOldFiles } from './disk';
import { accessTracker } from './access';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class GovernanceManager {
  private config: GovernanceConfig;
  private rateLimiter: RateLimiterMemory;
  private alerts: Alert[] = [];
  private cleanupTimer?: NodeJS.Timer;

  constructor(config?: Partial<GovernanceConfig>) {
    this.config = { ...DEFAULT_GOVERNANCE_CONFIG, ...config };

    this.rateLimiter = new RateLimiterMemory({
      points: this.config.rateLimitMax,
      duration: this.config.rateLimitWindow / 1000,
    });

    if (this.config.autoCleanupEnabled) {
      this.startAutoCleanup();
    }
  }

  async checkRateLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const result = await this.rateLimiter.consume(key);
      return { allowed: true, remaining: result.remainingPoints };
    } catch (error) {
      return { allowed: false, remaining: 0 };
    }
  }

  async checkResources(): Promise<{
    diskOk: boolean;
    concurrencyOk: boolean;
    alerts: Alert[];
  }> {
    const alerts: Alert[] = [];

    const diskQuota = await checkDiskQuota(this.config.diskQuotaMB);
    if (!diskQuota.allowed) {
      const alert = this.createAlert(
        'disk',
        'critical',
        `Disk usage exceeded quota: ${diskQuota.currentMB}MB / ${diskQuota.quotaMB}MB`,
        diskQuota.currentMB,
        diskQuota.quotaMB
      );
      alerts.push(alert);
    }

    return {
      diskOk: diskQuota.allowed,
      concurrencyOk: true,
      alerts,
    };
  }

  async performCleanup(): Promise<{ cleaned: number; errors: string[] }> {
    logger.info('Starting cleanup...');

    const result = await cleanupOldFiles(process.cwd(), this.config.maxPreviewAge);

    logger.info(`Cleanup complete: ${result.cleaned} projects cleaned`);

    return result;
  }

  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        const diskQuota = await checkDiskQuota(this.config.diskQuotaMB);

        if (diskQuota.currentMB > this.config.diskQuotaMB * (this.config.cleanupThresholdPercent / 100)) {
          logger.warn('Disk usage high, triggering cleanup');
          await this.performCleanup();
        }
      } catch (error) {
        logger.error('Auto cleanup failed', { error });
      }
    }, 300000);
  }

  private createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    message: string,
    value: number,
    threshold: number
  ): Alert {
    const alert: Alert = {
      id: uuidv4(),
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: new Date(),
    };

    this.alerts.push(alert);
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50);
    }

    logger.warn(`Alert: ${message}`);
    return alert;
  }

  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  getConfig(): GovernanceConfig {
    return { ...this.config };
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer as unknown as number);
    }
  }
}

export const governanceManager = new GovernanceManager();
