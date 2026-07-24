import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { processGithubUrl } from '../github-repo-manager';
import { captureGitHubRepo } from '../screenshot-service';
import {
  getHistory,
  searchHistory,
  getHistoryStats,
  removeFromHistory,
  clearHistory,
} from '../history';
import {
  createPreview,
  stopPreview,
  getPreview,
} from '../preview-runner';
import { getHealthStatus } from '../../utils/health';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { ApiResponse } from './types';

const previewProxies = new Map<string, any>();

function getOrCreateProxy(id: string, targetUrl: string): any {
  if (!previewProxies.has(id)) {
    const proxy = createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true,
      ws: true,
    });
    previewProxies.set(id, proxy);
  }
  return previewProxies.get(id);
}

export function removeProxy(id: string): void {
  previewProxies.delete(id);
}

export function createServer() {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use('/screenshots', express.static(path.join(config.clone.baseDir, '.screenshots')));

  app.use('/preview/:id', (req: Request, res: Response, next: NextFunction) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const instance = getPreview(id);

    if (!instance || instance.status !== 'running') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PREVIEW_NOT_RUNNING',
          message: 'Preview not found or not running',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const proxy = getOrCreateProxy(id, instance.url);
    proxy(req, res, next);
  });

  app.get('/api/health', async (req: Request, res: Response) => {
    const health = await getHealthStatus();
    const statusCode = health.status === 'unhealthy' ? 503 : 200;

    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      data: health,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/preview', async (req: Request, res: Response, next: NextFunction) => {
    const { url, mode = 'screenshot' } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_URL', message: 'URL is required' },
        timestamp: new Date().toISOString(),
      });
    }

    try {
      logger.info(`Processing preview request: ${url}, mode: ${mode}`);

      if (mode === 'live') {
        const result = await createPreview(url);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: { code: 'PREVIEW_FAILED', message: result.error, phase: result.phase },
            timestamp: new Date().toISOString(),
          });
        }

        const instance = result.instance!;
        return res.json({
          success: true,
          data: {
            mode: 'live',
            id: instance.id,
            url: `/preview/${instance.id}`,
            directUrl: instance.url,
            port: instance.port,
            status: instance.status,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const cloneResult = await processGithubUrl(url);
      const screenshotResult = await captureGitHubRepo(
        cloneResult.repo.owner,
        cloneResult.repo.name
      );

      const response: ApiResponse = {
        success: true,
        data: {
          mode: 'screenshot',
          repo: cloneResult.repo,
          preview: {
            type: 'screenshot',
            imagePath: `/screenshots/${path.basename(screenshotResult.imagePath)}`,
          },
          screenshot: {
            imagePath: `/screenshots/${path.basename(screenshotResult.imagePath)}`,
            url: screenshotResult.url,
            metadata: screenshotResult.metadata,
          },
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/live-preview/:id', (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const instance = getPreview(id);

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Preview not found' },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        id: instance.id,
        url: instance.url,
        port: instance.port,
        status: instance.status,
        repo: instance.repoFullName,
        startedAt: instance.startedAt,
        lastAccessedAt: instance.lastAccessedAt,
        config: instance.config,
        logs: instance.logs.slice(-50),
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/live-preview/:id/stop', async (req: Request, res: Response, next: NextFunction) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    try {
      await stopPreview(id);
      res.json({
        success: true,
        data: { message: 'Preview stopped' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/history', async (req: Request, res: Response, next: NextFunction) => {
    const { limit = 50, offset = 0, q } = req.query;

    try {
      let entries;
      if (q) {
        entries = await searchHistory(q as string);
      } else {
        entries = await getHistory(parseInt(limit as string), parseInt(offset as string));
      }

      res.json({
        success: true,
        data: { entries },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/history/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await getHistoryStats();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/history/:id', async (req: Request, res: Response, next: NextFunction) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    try {
      const removed = await removeFromHistory(id);
      res.json({
        success: true,
        data: { removed },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await clearHistory();
      res.json({
        success: true,
        data: { message: 'History cleared' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Request error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.toJSON().error,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/discover', (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), 'public', 'discover.html'));
  });

  app.get('/search', (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), 'public', 'search.html'));
  });

  app.get('/favorites', (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), 'public', 'discover.html'));
  });

  app.get('/history', (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), 'public', 'history.html'));
  });

  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  });

  return app;
}
