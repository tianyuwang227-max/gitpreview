import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import treeKill from 'tree-kill';
import { PreviewInstance, ProjectConfig } from './types';
import { allocatePort, releasePort, waitForPort } from './port-manager';
import { logger } from '../../utils/logger';
import { config } from '../../config';

export class ProcessManager extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map();
  private instances: Map<string, PreviewInstance> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  getRunningCount(): number {
    return Array.from(this.instances.values()).filter(i => i.status === 'running').length;
  }

  canStartNew(): boolean {
    return this.getRunningCount() < config.preview.maxConcurrent;
  }

  async startPreview(
    id: string,
    repoPath: string,
    projectConfig: ProjectConfig
  ): Promise<PreviewInstance> {
    if (!this.canStartNew()) {
      throw new Error(`Maximum concurrent previews reached (${config.preview.maxConcurrent})`);
    }

    logger.info(`Starting preview for ${id}`);

    const port = await allocatePort(projectConfig.port);

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
      timeout: config.preview.maxTimeoutMs,
      idleTimeout: config.preview.maxIdleMs,
      config: projectConfig,
      logs: [],
    };

    this.instances.set(id, instance);

    try {
      if (projectConfig.installCommand) {
        await this.runCommand(id, repoPath, projectConfig.installCommand, 120000);
      }

      if (projectConfig.buildCommand) {
        await this.runCommand(id, repoPath, projectConfig.buildCommand, 120000);
      }

      if (projectConfig.startCommand) {
        const childProcess = this.spawnProcess(id, repoPath, projectConfig.startCommand, port);
        instance.pid = childProcess.pid || null;
      }

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
      await this.cleanup(id);
      throw error;
    }
  }

  private runCommand(id: string, cwd: string, command: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`Running command for ${id}: ${command}`);

      const parts = command.split(/\s+/).filter(Boolean);
      const cmd = parts[0];
      const args = parts.slice(1);

      const childProcess = spawn(cmd, args, {
        cwd,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          NODE_ENV: 'development',
          PATH: process.env.PATH,
          HOME: process.env.HOME,
        },
        detached: false,
      });

      const timer = setTimeout(() => {
        this.killProcessTree(childProcess);
        reject(new Error(`Command timed out: ${command}`));
      }, timeout);

      childProcess.stdout?.on('data', (data: Buffer) => {
        this.addLog(id, data.toString());
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        this.addLog(id, data.toString());
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
    const parts = command.split(/\s+/).filter(Boolean);
    const cmd = parts[0];
    const args = parts.slice(1);

    const childProcess = spawn(cmd, args, {
      cwd,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        NODE_ENV: 'development',
        PORT: port.toString(),
        PATH: process.env.PATH,
        HOME: process.env.HOME,
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

  private killProcessTree(childProcess: ChildProcess): void {
    if (childProcess.pid) {
      try {
        treeKill(childProcess.pid, 'SIGTERM', (err) => {
          if (err) {
            logger.warn(`Failed to kill process tree ${childProcess.pid}: ${err}`);
            try {
              childProcess.kill('SIGKILL');
            } catch (killErr) {
              logger.error(`Failed to force kill process ${childProcess.pid}: ${killErr}`);
            }
          }
        });
      } catch (error) {
        logger.error(`Error killing process tree: ${error}`);
        try {
          childProcess.kill('SIGKILL');
        } catch (killErr) {
          // Process already dead
        }
      }
    }
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

  touchPreview(id: string): void {
    this.touchInstance(id);
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
    await this.cleanup(id);
  }

  private async cleanup(id: string): Promise<void> {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }

    const childProcess = this.processes.get(id);
    if (childProcess && !childProcess.killed) {
      this.killProcessTree(childProcess);

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          if (childProcess && !childProcess.killed) {
            try {
              childProcess.kill('SIGKILL');
            } catch (error) {
              // Process already dead
            }
          }
          resolve();
        }, 5000);
      });
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
