import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { DockerBuildOptions, DockerResult } from './types';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export async function buildImage(options: DockerBuildOptions): Promise<DockerResult> {
  const { repoPath, imageName, config, timeout = 300000 } = options;

  logger.info(`Building Docker image: ${imageName}`);

  try {
    const dockerfilePath = path.join(repoPath, 'Dockerfile');
    const hasDockerfile = await fileExists(dockerfilePath);

    if (!hasDockerfile) {
      logger.info('No Dockerfile found, generating one...');
      const { generateDockerfile } = await import('./detector');
      const dockerfile = generateDockerfile(config);
      await fs.writeFile(dockerfilePath, dockerfile);
      logger.info('Dockerfile generated');
    }

    const command = `docker build -t ${imageName} -f ${dockerfilePath} ${repoPath}`;

    logger.info(`Running: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    });

    logger.info(`Image built successfully: ${imageName}`);

    return {
      success: true,
      logs: stdout || stderr,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Build failed: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function removeImage(imageName: string): Promise<void> {
  try {
    await execAsync(`docker rmi ${imageName} -f`);
    logger.info(`Image removed: ${imageName}`);
  } catch (error) {
    logger.warn(`Failed to remove image: ${imageName}`);
  }
}

export async function imageExists(imageName: string): Promise<boolean> {
  try {
    await execAsync(`docker image inspect ${imageName}`);
    return true;
  } catch {
    return false;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
