import net from 'net';
import { MIN_PORT, MAX_PORT } from './types';
import { logger } from '../../utils/logger';

const allocatedPorts = new Set<number>();

export async function allocatePort(preferred?: number): Promise<number> {
  if (preferred && await isPortAvailable(preferred) && !allocatedPorts.has(preferred)) {
    allocatedPorts.add(preferred);
    return preferred;
  }

  for (let port = MIN_PORT; port <= MAX_PORT; port++) {
    if (!allocatedPorts.has(port) && await isPortAvailable(port)) {
      allocatedPorts.add(port);
      return port;
    }
  }

  throw new Error('No available ports');
}

export function releasePort(port: number): void {
  allocatedPorts.delete(port);
  logger.info(`Released port ${port}`);
}

export function getAllocatedPorts(): number[] {
  return Array.from(allocatedPorts);
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(port, () => {
      server.close(() => resolve(true));
    });

    server.on('error', () => resolve(false));
  });
}

export async function waitForPort(port: number, timeout: number = 30000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await isPortListening(port)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return false;
}

async function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(1000);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, '127.0.0.1');
  });
}
