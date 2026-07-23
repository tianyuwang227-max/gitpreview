import { detectProject, generateDockerfile } from '../src/modules/docker-runner/detector';
import { ProjectConfig } from '../src/modules/docker-runner/types';
import fs from 'fs/promises';
import path from 'path';

describe('Docker Detector', () => {
  const testDir = path.join(__dirname, 'temp-test');

  beforeEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should detect Node.js project', async () => {
    await fs.writeFile(path.join(testDir, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: { express: '^4.0.0' }
    }));

    const config = await detectProject(testDir);
    expect(config.type).toBe('node');
    expect(config.framework).toBe('express');
  });

  it('should detect Python project', async () => {
    await fs.writeFile(path.join(testDir, 'requirements.txt'), 'flask==2.0.0');

    const config = await detectProject(testDir);
    expect(config.type).toBe('python');
  });

  it('should detect static project', async () => {
    await fs.writeFile(path.join(testDir, 'index.html'), '<html></html>');

    const config = await detectProject(testDir);
    expect(config.type).toBe('static');
  });

  it('should generate Node.js Dockerfile', () => {
    const config: ProjectConfig = {
      type: 'node',
      port: 3000,
      startCommand: 'npm start',
    };

    const dockerfile = generateDockerfile(config);
    expect(dockerfile).toContain('FROM node:18-alpine');
    expect(dockerfile).toContain('EXPOSE 3000');
  });

  it('should generate Python Dockerfile', () => {
    const config: ProjectConfig = {
      type: 'python',
      port: 5000,
      startCommand: 'python app.py',
    };

    const dockerfile = generateDockerfile(config);
    expect(dockerfile).toContain('FROM python:3.11-slim');
    expect(dockerfile).toContain('EXPOSE 5000');
  });

  it('should generate static Dockerfile', () => {
    const config: ProjectConfig = {
      type: 'static',
      port: 80,
    };

    const dockerfile = generateDockerfile(config);
    expect(dockerfile).toContain('FROM nginx:alpine');
    expect(dockerfile).toContain('EXPOSE 80');
  });
});
