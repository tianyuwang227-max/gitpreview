import { screenshotService } from './screenshot';
import { screenshotStorage } from './storage';
import { ScreenshotOptions, ScreenshotResult } from './types';
import { logger } from '../../utils/logger';

export { screenshotService } from './screenshot';
export { screenshotStorage } from './storage';
export type { ScreenshotOptions, ScreenshotResult, ViewportConfig } from './types';

const ONE_HOUR = 60 * 60 * 1000;

export async function captureWithCache(
  options: ScreenshotOptions,
  maxAge: number = ONE_HOUR
): Promise<ScreenshotResult> {
  await screenshotStorage.init();

  const cached = await screenshotStorage.exists(options.url, maxAge);
  if (cached) {
    logger.info(`Using cached screenshot for ${options.url}`);
    const record = screenshotStorage.getLatest(options.url)!;
    return {
      success: true,
      imagePath: record.imagePath,
      url: record.url,
      timestamp: new Date(record.capturedAt),
      metadata: record.metadata,
    };
  }

  const result = await screenshotService.capture(options);
  await screenshotStorage.save(result);

  return result;
}

export async function captureGitHubRepo(owner: string, repo: string): Promise<ScreenshotResult> {
  return captureWithCache({
    url: `https://github.com/${owner}/${repo}`,
    width: 1280,
    height: 900,
  });
}
