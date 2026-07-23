import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { processGithubUrl } from '../github-repo-manager';
import { captureGitHubRepo } from '../screenshot-service';
import { runAndCapture } from '../docker-runner';
import { analyzeRepo } from '../repo-analyzer';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { taskQueue } from '../../utils/task-queue';
import { ApiResponse, RepoPreviewResponse } from './types';

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use('/screenshots', express.static(path.join(config.clone.baseDir, '.screenshots')));

  taskQueue.registerHandler('preview', async (task) => {
    const { url, useDocker = false } = task.data;
    logger.info(`Processing async task ${task.id} for URL: ${url}`);

    taskQueue.updateProgress(task.id, 10);

    const cloneResult = await processGithubUrl(url);

    taskQueue.updateProgress(task.id, 25);

    const analysis = await analyzeRepo(cloneResult.localPath);

    taskQueue.updateProgress(task.id, 40);

    let screenshotPath: string;
    let dockerResult: any = null;

    if (useDocker) {
      logger.info('Using Docker for live preview');
      dockerResult = await runAndCapture(
        cloneResult.localPath,
        cloneResult.repo.name.toLowerCase()
      );

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
      const screenshotResult = await captureGitHubRepo(
        cloneResult.repo.owner,
        cloneResult.repo.name
      );
      screenshotPath = screenshotResult.imagePath;
    }

    taskQueue.updateProgress(task.id, 90);

    return {
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
  });

  app.get('/api/health', (req: Request, res: Response) => {
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'ok',
        tasks: taskQueue.getStats(),
      },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  });

  app.post('/api/preview', async (req: Request, res: Response, next: NextFunction) => {
    const { url, async: isAsync } = req.body;

    if (!url) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'URL is required',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    try {
      if (isAsync) {
        const taskId = await taskQueue.enqueue('preview', { url });
        const response: ApiResponse = {
          success: true,
          data: { taskId },
          timestamp: new Date().toISOString(),
        };
        return res.status(202).json(response);
      }

      logger.info(`Processing preview request: ${url}`);

      const cloneResult = await processGithubUrl(url);
      const screenshotResult = await captureGitHubRepo(
        cloneResult.repo.owner,
        cloneResult.repo.name
      );

      const response: ApiResponse<RepoPreviewResponse> = {
        success: true,
        data: {
          repo: cloneResult.repo,
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
    const { taskId } = req.params;
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

  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Request error', { error, path: req.path });

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

  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  });

  return app;
}
