import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { processGithubUrl } from '../github-repo-manager';
import { captureGitHubRepo } from '../screenshot-service';
import { runAndCapture } from '../docker-runner';
import { analyzeRepo } from '../repo-analyzer';
import {
  getDiscoveryData,
  searchProjects,
  getTrending,
  getCategories,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
} from '../discovery';
import { sendProgress, sendCompleted } from '../websocket';
import {
  addToHistory,
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
  getAllPreviews,
  getRunningPreviews,
} from '../preview-runner';
import {
  getGovernanceStatus,
  checkRequestAllowed,
  accessTracker,
  governanceManager,
} from '../governance';
import { getHealthStatus } from '../../utils/health';
import { requestLogger } from '../../utils/request-logger';
import { register } from '../../utils/metrics';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { taskQueue } from '../../utils/task-queue';
import { getCacheStats } from '../../utils/cache-middleware';
import { perfMonitor } from '../../utils/performance';
import { ApiResponse, RepoPreviewResponse } from './types';

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use('/screenshots', express.static(path.join(config.clone.baseDir, '.screenshots')));

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      accessTracker.recordRequest(duration, res.statusCode < 400, ip);
    });

    const check = await checkRequestAllowed(ip);
    if (!check.allowed) {
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: check.reason },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  });

  taskQueue.registerHandler('preview', async (task) => {
    const { url, useDocker = false } = task.data;
    logger.info(`Processing async task ${task.id} for URL: ${url}`);

    sendProgress(task.id, 10, '正在验证 URL...');
    taskQueue.updateProgress(task.id, 10);

    const cloneResult = await processGithubUrl(url);

    sendProgress(task.id, 25, '正在克隆仓库...');
    taskQueue.updateProgress(task.id, 25);

    const analysis = await analyzeRepo(cloneResult.localPath);

    sendProgress(task.id, 40, '正在分析项目...');
    taskQueue.updateProgress(task.id, 40);

    let screenshotPath: string;
    let dockerResult: any = null;

    if (useDocker) {
      sendProgress(task.id, 50, '正在启动 Docker 容器...');
      logger.info('Using Docker for live preview');
      dockerResult = await runAndCapture(
        cloneResult.localPath,
        cloneResult.repo.name.toLowerCase()
      );

      sendProgress(task.id, 70, '正在截取预览图...');

      if (dockerResult.success && dockerResult.screenshot) {
        screenshotPath = dockerResult.screenshot;
      } else {
        logger.warn('Docker preview failed, falling back to GitHub screenshot');
        const screenshotResult = await captureGitHubRepo(
          cloneResult.repo.owner,
          cloneResult.repo.name
        );
        screenshotPath = screenshotResult.imagePath;
      }
    } else {
      sendProgress(task.id, 60, '正在截取预览图...');
      const screenshotResult = await captureGitHubRepo(
        cloneResult.repo.owner,
        cloneResult.repo.name
      );
      screenshotPath = screenshotResult.imagePath;
    }

    sendProgress(task.id, 90, '正在整理数据...');
    taskQueue.updateProgress(task.id, 90);

    const result = {
      repo: cloneResult.repo,
      analysis: {
        readme: {
          summary: analysis.readme.summary,
          hasImages: analysis.readme.hasImages,
          hasBadges: analysis.readme.hasBadges,
          sections: analysis.readme.sections.length,
        },
        directory: {
          tree: analysis.directory.tree,
          totalFiles: analysis.directory.totalFiles,
          totalDirs: analysis.directory.totalDirs,
        },
        techStack: analysis.techStack,
        recentCommits: analysis.recentCommits,
        license: analysis.license,
        lastUpdated: analysis.lastUpdated,
      },
      preview: {
        type: useDocker && dockerResult?.success ? 'live' : 'screenshot',
        imagePath: `/screenshots/${path.basename(screenshotPath)}`,
        projectType: dockerResult?.projectType,
        framework: dockerResult?.framework,
      },
      screenshot: {
        imagePath: `/screenshots/${path.basename(screenshotPath)}`,
        url: `https://github.com/${cloneResult.repo.owner}/${cloneResult.repo.name}`,
        metadata: {
          width: 1280,
          height: 900,
          format: 'png',
          fileSize: 0,
        },
      },
    };

    sendCompleted(task.id, result);

    addToHistory({
      url,
      owner: result.repo.owner,
      name: result.repo.name,
      fullName: result.repo.fullName,
      description: result.repo.description,
      language: result.repo.language,
      stars: result.repo.stars,
      previewType: result.preview.type as 'screenshot' | 'live',
      thumbnailPath: result.screenshot.imagePath,
    }).catch(err => logger.error('Failed to add to history', { err }));

    return result;
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

  app.get('/api/governance', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await getGovernanceStatus();
      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/governance/alerts', (req: Request, res: Response) => {
    const alerts = governanceManager.getAlerts();
    res.json({
      success: true,
      data: { alerts },
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/governance/cleanup', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await governanceManager.performCleanup();
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).end();
    }
  });

  app.get('/api/discovery', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getDiscoveryData();
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/search', async (req: Request, res: Response, next: NextFunction) => {
    const { q, page = 1, per_page = 30, sort, order = 'desc' } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: 'Search query is required' },
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const results = await searchProjects(
        q as string,
        parseInt(page as string),
        parseInt(per_page as string),
        sort as any,
        order as any
      );

      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/trending', async (req: Request, res: Response, next: NextFunction) => {
    const { language, since = 'weekly' } = req.query;

    try {
      const projects = await getTrending(
        language as string,
        since as 'daily' | 'weekly' | 'monthly'
      );

      res.json({
        success: true,
        data: { projects },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/categories', (req: Request, res: Response) => {
    const categories = getCategories();
    res.json({
      success: true,
      data: { categories },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/favorites', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { favoritesManager } = await import('../discovery');
      const favorites = await favoritesManager.getAllFavorites();
      res.json({
        success: true,
        data: { favorites },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/favorites', async (req: Request, res: Response, next: NextFunction) => {
    const { fullName, notes } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'fullName is required' },
        timestamp: new Date().toISOString(),
      });
    }

    try {
      await addToFavorites(fullName, notes);
      res.json({
        success: true,
        data: { message: 'Added to favorites' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/favorites/:owner/:repo', async (req: Request, res: Response, next: NextFunction) => {
    const { owner, repo } = req.params;

    try {
      const removed = await removeFromFavorites(`${owner}/${repo}`);
      res.json({
        success: true,
        data: { removed },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/favorites/check/:owner/:repo', async (req: Request, res: Response, next: NextFunction) => {
    const { owner, repo } = req.params;

    try {
      const isFav = await isFavorite(`${owner}/${repo}`);
      res.json({
        success: true,
        data: { isFavorite: isFav },
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

  app.post('/api/live-preview', async (req: Request, res: Response, next: NextFunction) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_URL', message: 'URL is required' },
        timestamp: new Date().toISOString(),
      });
    }

    try {
      logger.info(`Creating live preview for: ${url}`);
      const result = await createPreview(url);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'PREVIEW_FAILED', message: result.error, phase: result.phase },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(201).json({
        success: true,
        data: {
          id: result.instance!.id,
          url: result.instance!.url,
          port: result.instance!.port,
          status: result.instance!.status,
          repo: result.instance!.repoFullName,
        },
        timestamp: new Date().toISOString(),
      });
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

  app.get('/api/live-previews', (req: Request, res: Response) => {
    const previews = getAllPreviews();

    res.json({
      success: true,
      data: {
        previews: previews.map(p => ({
          id: p.id,
          url: p.url,
          port: p.port,
          status: p.status,
          repo: p.repoFullName,
          startedAt: p.startedAt,
        })),
        total: previews.length,
        running: getRunningPreviews().length,
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/live-previews/running', (req: Request, res: Response) => {
    const previews = getRunningPreviews();

    res.json({
      success: true,
      data: {
        previews: previews.map(p => ({
          id: p.id,
          url: p.url,
          port: p.port,
          status: p.status,
          repo: p.repoFullName,
          startedAt: p.startedAt,
        })),
        total: previews.length,
      },
      timestamp: new Date().toISOString(),
    });
  });

  const previewProxies = new Map<string, any>();

  app.use('/preview/:id', (req: Request, res: Response, next: NextFunction) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const instance = getPreview(id);

    if (!instance || instance.status !== 'running') {
      return res.status(404).json({
        success: false,
        error: { code: 'PREVIEW_NOT_RUNNING', message: 'Preview is not running' },
        timestamp: new Date().toISOString(),
      });
    }

    if (!previewProxies.has(id)) {
      const proxy = createProxyMiddleware({
        target: instance.url,
        changeOrigin: true,
        ws: true,
      });
      previewProxies.set(id, proxy);
    }

    const proxy = previewProxies.get(id);
    proxy(req, res, next);
  });

  app.post('/api/preview', async (req: Request, res: Response, next: NextFunction) => {
    const { url, mode = 'auto' } = req.body;

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

  app.get('/api/tasks/:taskId', (req: Request, res: Response) => {
    const taskId = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
    const status = taskQueue.getStatus(taskId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  });

  app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId = Math.random().toString(36).substring(7);

    logger.error('Request error', {
      requestId,
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.toJSON().error,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message?.includes('ECONNREFUSED')) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable',
          userMessage: '服务暂时不可用，请稍后重试',
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message?.includes('ETIMEDOUT') || error.message?.includes('timeout')) {
      return res.status(504).json({
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Request timeout',
          userMessage: '请求超时，请稍后重试',
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message?.includes('ENOSPACE') || error.message?.includes('ENOSPC')) {
      return res.status(507).json({
        success: false,
        error: {
          code: 'DISK_FULL',
          message: 'Disk space exhausted',
          userMessage: '服务器磁盘空间不足',
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
        userMessage: '服务器内部错误，请稍后重试',
      },
      requestId,
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
