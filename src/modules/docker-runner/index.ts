import path from 'path';
import { detectProject, generateDockerfile } from './detector';
import { buildImage, removeImage, imageExists } from './builder';
import { runContainer, stopContainer, getContainerLogs } from './runner';
import { captureRunningApp, waitForAppReady } from './capturer';
import { ProjectConfig, ContainerInfo, DockerResult } from './types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export { detectProject, generateDockerfile } from './detector';
export { buildImage, removeImage } from './builder';
export { runContainer, stopContainer, getContainerLogs } from './runner';
export { captureRunningApp, waitForAppReady } from './capturer';
export type { ProjectConfig, ContainerInfo, DockerResult, ProjectType } from './types';

export interface PreviewResult {
  success: boolean;
  projectType: string;
  framework?: string;
  container?: ContainerInfo;
  screenshot?: string;
  error?: string;
  logs?: string;
}

export async function runAndCapture(
  repoPath: string,
  repoName: string
): Promise<PreviewResult> {
  const imageName = `gitpreview/${repoName}:latest`;
  const containerName = `gitpreview-${repoName}-${Date.now()}`;

  logger.info(`Starting preview for ${repoName}`);

  try {
    const projectConfig = await detectProject(repoPath);
    logger.info(`Project type: ${projectConfig.type}, framework: ${projectConfig.framework || 'none'}`);

    if (projectConfig.type === 'unknown') {
      return {
        success: false,
        projectType: 'unknown',
        error: 'Unable to detect project type. Cannot generate preview.',
      };
    }

    const buildResult = await buildImage({
      repoPath,
      imageName,
      config: projectConfig,
    });

    if (!buildResult.success) {
      return {
        success: false,
        projectType: projectConfig.type,
        framework: projectConfig.framework,
        error: `Build failed: ${buildResult.error}`,
        logs: buildResult.logs,
      };
    }

    const runResult = await runContainer({
      imageName,
      containerName,
      port: projectConfig.port,
    });

    if (!runResult.success || !runResult.container) {
      await removeImage(imageName);
      return {
        success: false,
        projectType: projectConfig.type,
        framework: projectConfig.framework,
        error: `Container failed to start: ${runResult.error}`,
      };
    }

    const appReady = await waitForAppReady(runResult.container.url, 30, 2000);

    if (!appReady) {
      const logs = await getContainerLogs(containerName);
      await stopContainer(containerName);
      await removeImage(imageName);

      return {
        success: false,
        projectType: projectConfig.type,
        framework: projectConfig.framework,
        container: runResult.container,
        error: 'Application did not start properly',
        logs,
      };
    }

    const screenshotResult = await captureRunningApp(runResult.container, {
      width: 1280,
      height: 800,
      waitTime: 3000,
    });

    await stopContainer(containerName);
    await removeImage(imageName);

    return {
      success: true,
      projectType: projectConfig.type,
      framework: projectConfig.framework,
      container: runResult.container,
      screenshot: screenshotResult.success ? screenshotResult.imagePath : undefined,
      error: screenshotResult.error,
    };
  } catch (error) {
    logger.error(`Preview failed: ${error}`);

    try {
      await stopContainer(containerName);
      await removeImage(imageName);
    } catch {
      // Cleanup errors are non-critical
    }

    return {
      success: false,
      projectType: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
