import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { PreviewInstance, ProjectConfig } from './types';
import { allocatePort, releasePort, waitForPort } from './port-manager';
import { logger } from '../../utils/logger';

export class ProcessManager extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map();
  private instances: Map<string, PreviewInstance> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  async startPreview(
    id: string,
    repoPath: string,
    config: ProjectConfig
  ): Promise<PreviewInstance> {
    logger.info(`Starting preview for ${id}`);

    const port = await allocatePort(config.port);

    const instance: PreviewInstance = {
      id,
      repoFullName: '',
      localPath: repoPath,
      port,
      url: `http://localhost:${port}`,
      status: 'starting',
      pid: null,
      startedAt: new Date(),
      lastAccessedAt: new Date(),
      timeout: 300000,
      idleTimeout: 600000,
      config,
      logs: [],
    };

    this.instances.set(id, instance);

    try {
      if (config.installCommand) {
        await this.runCommand(id, repoPath, config.installCommand, 120000);
      }

      if (config.buildCommand) {
        await this.runCommand(id, repoPath, config.buildCommand, 120000);
      }

      const process = this.spawnProcess(id, repoPath, config.startCommand, port);

      instance.pid = process.pid || null;

      const portReady = await waitForPort(port, 60000);
      if (!portReady) {
        throw new Error(`Port ${port} did not become ready within timeout`);
      }

      instance.status = 'running';
      this.emit('started', instance);

      this.startIdleTimer(id);

      logger.info(`Preview started: ${instance.url}`);
      return instance;
    } catch (error) {
      instance.status = 'failed';
      this.cleanup(id);
      throw error;
    }
  }

  private runCommand(id: string, cwd: string, command: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`Running command for ${id}: ${command}`);

      const [cmd, ...args] = command.split(' ');
      const childProcess = spawn(cmd, args, {
        cwd,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'development' },
      });

      const timer = setTimeout(() => {
        childProcess.kill('SIGTERM');
        reject(new Error(`Command timed out: ${command}`));
      }, timeout);

      childProcess.stdout?.on('data', (data: Buffer) => {
        const log = data.toString();
        this.addLog(id, log);
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        const log = data.toString();
        this.addLog(id, log);
      });

      childProcess.on('close', (code: number | null) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}: ${command}`));
        }
      });

      childProcess.on('error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private spawnProcess(id: string, cwd: string, command: string, port: number): ChildProcess {
    const [cmd, ...args] = command.split(' ');

    const childProcess = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'development',
      },
      detached: false,
    });

    this.processes.set(id, childProcess);

    childProcess.stdout?.on('data', (data: Buffer) => {
      this.addLog(id, data.toString());
      this.touchInstance(id);
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      this.addLog(id, data.toString());
      this.touchInstance(id);
    });

    childProcess.on('exit', (code: number | null, signal: string | null) => {
      logger.info(`Process ${id} exited with code ${code}, signal ${signal}`);
      const instance = this.instances.get(id);
      if (instance) {
        instance.status = 'stopped';
      }
      this.emit('stopped', id);
      this.cleanup(id);
    });

    childProcess.on('error', (error: Error) => {
      logger.error(`Process ${id} error: ${error.message}`);
      const instance = this.instances.get(id);
      if (instance) {
        instance.status = 'failed';
      }
      this.emit('error', id, error);
      this.cleanup(id);
    });

    return childProcess;
  }

  private addLog(id: string, log: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.logs.push(log);
      if (instance.logs.length > 1000) {
        instance.logs = instance.logs.slice(-500);
      }
      this.emit('log', id, log);
    }
  }

  private touchInstance(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.lastAccessedAt = new Date();
    }
  }

  private startIdleTimer(id: string): void {
    const instance = this.instances.get(id);
    if (!instance) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const idleTime = now - instance.lastAccessedAt.getTime();

      if (idleTime > instance.idleTimeout) {
        logger.info(`Preview ${id} idle timeout, stopping`);
        this.stopPreview(id);
      }
    }, 60000);

    this.timers.set(id, timer);
  }

  async stopPreview(id: string): Promise<void> {
    logger.info(`Stopping preview ${id}`);
    this.cleanup(id);
  }

  private cleanup(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }

    const process = this.processes.get(id);
    if (process && !process.killed) {
      try {
        process.kill('SIGTERM');

        setTimeout(() => {
          if (process && !process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
      } catch (error) {
        logger.error(`Failed to kill process ${id}: ${error}`);
      }
    }
    this.processes.delete(id);

    const instance = this.instances.get(id);
    if (instance) {
      releasePort(instance.port);
      instance.status = 'stopped';
    }
  }

  getInstance(id: string): PreviewInstance | undefined {
    return this.instances.get(id);
  }

  getAllInstances(): PreviewInstance[] {
    return Array.from(this.instances.values());
  }

  getRunningInstances(): PreviewInstance[] {
    return Array.from(this.instances.values()).filter(i => i.status === 'running');
  }

  async stopAll(): Promise<void> {
    const ids = Array.from(this.instances.keys());
    for (const id of ids) {
      await this.stopPreview(id);
    }
  }
}

export const processManager = new ProcessManager();
