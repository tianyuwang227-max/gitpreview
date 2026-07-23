import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../../config';
import { ScreenshotOptions, ScreenshotResult, ViewportConfig } from './types';
import { logger } from '../../utils/logger';

const DEFAULT_VIEWPORT: ViewportConfig = {
  width: 1280,
  height: 800,
  deviceScaleFactor: 1,
};

export class ScreenshotService {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    if (this.browser) return;

    logger.info('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    logger.info('Browser launched');
  }

  async capture(options: ScreenshotOptions): Promise<ScreenshotResult> {
    if (!this.browser) {
      await this.init();
    }

    const {
      url,
      width = DEFAULT_VIEWPORT.width,
      height = DEFAULT_VIEWPORT.height,
      fullPage = false,
      format = 'png',
    } = options;

    logger.info(`Capturing screenshot: ${url}`);

    const page: Page = await this.browser!.newPage();

    try {
      await page.setViewport({ width, height });

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: config.clone.timeout,
      });

      await this.waitForContent(page);

      const imagePath = await this.generateImagePath(url, format);
      await fs.mkdir(path.dirname(imagePath), { recursive: true });

      await page.screenshot({
        path: imagePath,
        fullPage,
        type: format,
      });

      const stats = await fs.stat(imagePath);

      logger.info(`Screenshot saved: ${imagePath}`);

      return {
        success: true,
        imagePath,
        url,
        timestamp: new Date(),
        metadata: {
          width,
          height,
          format,
          fileSize: stats.size,
        },
      };
    } catch (error) {
      logger.error(`Screenshot failed: ${url}`, { error });
      throw new Error(`Screenshot failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await page.close();
    }
  }

  async captureGitHubRepo(owner: string, repo: string): Promise<ScreenshotResult> {
    const url = `https://github.com/${owner}/${repo}`;
    return this.capture({
      url,
      width: 1280,
      height: 900,
      fullPage: false,
    });
  }

  async captureGitHubReadme(owner: string, repo: string): Promise<ScreenshotResult> {
    const url = `https://github.com/${owner}/${repo}#readme`;
    return this.capture({
      url,
      width: 1280,
      height: 900,
      fullPage: true,
    });
  }

  private async waitForContent(page: Page): Promise<void> {
    try {
      await page.waitForSelector('article, .readme, .markdown-body', {
        timeout: 5000,
      });
    } catch {
      logger.debug('Content selector not found, proceeding anyway');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async generateImagePath(url: string, format: string): Promise<string> {
    const timestamp = Date.now();
    const sanitized = url
      .replace(/https?:\/\//, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);

    const filename = `${sanitized}_${timestamp}.${format}`;
    return path.join(config.clone.baseDir, '.screenshots', filename);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }
}

export const screenshotService = new ScreenshotService();
