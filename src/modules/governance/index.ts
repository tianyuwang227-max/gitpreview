import { GovernanceManager, governanceManager } from './manager';
import { getDiskUsage, checkDiskQuota, cleanupOldFiles, getProjectSize } from './disk';
import { accessTracker } from './access';
import { GovernanceConfig, DiskUsage, AccessStats, Alert } from './types';

export { GovernanceManager, governanceManager } from './manager';
export { getDiskUsage, checkDiskQuota, cleanupOldFiles, getProjectSize } from './disk';
export { accessTracker } from './access';
export type { GovernanceConfig, DiskUsage, AccessStats, Alert } from './types';

export async function getGovernanceStatus(): Promise<{
  disk: DiskUsage;
  access: AccessStats;
  alerts: Alert[];
  config: GovernanceConfig;
}> {
  const [disk, access, alerts, config] = await Promise.all([
    getDiskUsage(process.cwd()),
    Promise.resolve(accessTracker.getStats()),
    Promise.resolve(governanceManager.getAlerts()),
    Promise.resolve(governanceManager.getConfig()),
  ]);

  return { disk, access, alerts, config };
}

export async function checkRequestAllowed(ip: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const rateLimit = await governanceManager.checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return { allowed: false, reason: 'Rate limit exceeded' };
  }

  const resources = await governanceManager.checkResources();
  if (!resources.diskOk) {
    return { allowed: false, reason: 'Disk quota exceeded' };
  }

  return { allowed: true };
}
