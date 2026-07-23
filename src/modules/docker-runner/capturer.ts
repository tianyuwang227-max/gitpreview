import puppeteer, { Browser } from 'puppeteer';
import { ContainerInfo } from './types';
import { logger } from '../../utils/logger';

export async function captureRunningApp(
  container: ContainerInfo,
  options: { width?: number; height?: number; waitTime?: number } = {}
): Promise<{ success: boolean; imagePath: string; error?: string }> {
  const { width = 1280, height = 800, waitTime = 5000 } = options;

  logger.info(`Capturing running app at ${container.url}`);

  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });

    await page.goto(container.url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await new Promise(resolve => setTimeout(resolve, waitTime));

    const imagePath = `/tmp/gitpreview_${container.name}_${Date.now()}.png`;

    await page.screenshot({
      path: imagePath,
      fullPage: false,
    });

    logger.info(`Screenshot saved: ${imagePath}`);

    return {
      success: true,
      imagePath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Screenshot failed: ${errorMessage}`);

    return {
      success: false,
      imagePath: '',
      error: errorMessage,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function waitForAppReady(
  url: string,
  maxRetries: number = 30,
  interval: number = 2000
): Promise<boolean> {
  logger.info(`Waiting for app to be ready at ${url}`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status < 500) {
        logger.info('App is ready');
        return true;
      }
    } catch {
      // App not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  logger.warn('App did not become ready in time');
  return false;
}
