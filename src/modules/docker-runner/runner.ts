import { exec } from 'child_process';
import { promisify } from 'util';
import { DockerRunOptions, ContainerInfo, DockerResult } from './types';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

const allocatedPorts = new Set<number>();

export async function runContainer(options: DockerRunOptions): Promise<DockerResult> {
  const { imageName, containerName, port, timeout = 60000, env = {} } = options;

  logger.info(`Starting container: ${containerName}`);

  try {
    await stopContainer(containerName);

    const hostPort = await findAvailablePort(port);

    const envArgs = Object.entries(env)
      .map(([key, value]) => `-e ${key}="${value}"`)
      .join(' ');

    const command = `docker run -d --name ${containerName} -p ${hostPort}:${port} ${envArgs} --memory=512m --cpus=1 ${imageName}`;

    logger.info(`Running: ${command}`);

    const { stdout } = await execAsync(command, { timeout });
    const containerId = stdout.trim();

    await waitForContainer(containerName, 30000);

    const containerInfo: ContainerInfo = {
      id: containerId,
      name: containerName,
      image: imageName,
      status: 'running',
      port: hostPort,
      url: `http://localhost:${hostPort}`,
      startedAt: new Date(),
    };

    allocatedPorts.add(hostPort);

    logger.info(`Container started: ${containerName} on port ${hostPort}`);

    return {
      success: true,
      container: containerInfo,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to start container: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function stopContainer(containerName: string): Promise<void> {
  try {
    await execAsync(`docker stop ${containerName}`);
    await execAsync(`docker rm ${containerName}`);
    logger.info(`Container stopped: ${containerName}`);
  } catch {
    // Container might not exist
  }
}

export async function getContainerInfo(containerName: string): Promise<ContainerInfo | null> {
  try {
    const { stdout } = await execAsync(
      `docker inspect --format '{{.Id}} {{.State.Status}} {{.NetworkSettings.Ports}}' ${containerName}`
    );

    const [id, status, portsJson] = stdout.trim().split(' ');
    const ports = JSON.parse(portsJson.replace(/'/g, '"'));
    const firstPort = Object.values(ports)[0] as any[];
    const port = firstPort?.[0]?.HostPort || 0;

    return {
      id,
      name: containerName,
      image: '',
      status,
      port: parseInt(String(port)),
      url: `http://localhost:${port}`,
      startedAt: new Date(),
    };
  } catch {
    return null;
  }
}

export async function getContainerLogs(containerName: string, lines: number = 100): Promise<string> {
  try {
    const { stdout } = await execAsync(`docker logs --tail ${lines} ${containerName}`);
    return stdout;
  } catch {
    return '';
  }
}

async function waitForContainer(containerName: string, timeout: number): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const { stdout } = await execAsync(
        `docker inspect --format '{{.State.Health.Status}}' ${containerName} 2>/dev/null || echo "no-health"`
      );

      const healthStatus = stdout.trim();

      if (healthStatus === 'healthy' || healthStatus === 'no-health') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return;
      }
    } catch {
      // Container might not be ready
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function findAvailablePort(preferredPort: number): Promise<number> {
  const net = await import('net');

  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
  };

  if (await isPortAvailable(preferredPort)) {
    return preferredPort;
  }

  for (let port = 10000; port < 60000; port++) {
    if (!allocatedPorts.has(port) && await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error('No available port found');
}

export function cleanup(): void {
  allocatedPorts.clear();
}
