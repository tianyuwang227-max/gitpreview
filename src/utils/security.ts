import { logger } from './logger';

export const BLOCKED_SCRIPTS = new Set([
  'preinstall',
  'postinstall',
  'preuninstall',
  'postuninstall',
  'prepare',
  'prepack',
  'postpack',
  'prepublish',
  'postpublish',
]);

export const ALLOWED_SCRIPTS = new Set([
  'install',
  'build',
  'start',
  'dev',
  'preview',
  'serve',
  'test',
]);

export const SAFE_ENV_KEYS = new Set([
  'NODE_ENV',
  'PORT',
  'HOME',
  'PATH',
  'LANG',
  'LC_ALL',
  'HOSTNAME',
  'TERM',
  'SHELL',
  'USER',
  'TMPDIR',
  'TEMP',
  'TMP',
]);

export const BLOCKED_ENV_PATTERNS = [
  /TOKEN/i,
  /SECRET/i,
  /KEY/i,
  /PASSWORD/i,
  /CREDENTIAL/i,
  /AUTH/i,
  /API/i,
];

export function sanitizeEnvironment(baseEnv: NodeJS.ProcessEnv): Record<string, string> {
  const safeEnv: Record<string, string> = {};

  for (const key of SAFE_ENV_KEYS) {
    if (baseEnv[key]) {
      safeEnv[key] = baseEnv[key];
    }
  }

  safeEnv.NODE_ENV = 'development';
  safeEnv.HOME = '/tmp';
  safeEnv.TMPDIR = '/tmp';

  return safeEnv;
}

export function validateScriptName(scriptName: string): boolean {
  if (BLOCKED_SCRIPTS.has(scriptName)) {
    logger.warn(`Blocked script execution: ${scriptName}`);
    return false;
  }
  return true;
}

export function sanitizeCommand(command: string): string {
  const dangerousPatterns = [
    /\$\(.*\)/g,
    /`.*`/g,
    /\|\s*bash/g,
    /\|\s*sh/g,
    /&&.*rm\s+-rf/g,
    /curl.*\|\s*sh/g,
    /wget.*\|\s*sh/g,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      logger.warn(`Blocked dangerous command pattern: ${command}`);
      throw new Error('Command contains potentially dangerous patterns');
    }
  }

  return command;
}

export function parseCommand(command: string): { cmd: string; args: string[] } {
  const parts = command.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    throw new Error('Empty command');
  }

  const cmd = parts[0];
  const args = parts.slice(1);

  return { cmd, args };
}

export function validatePackageJsonScripts(scripts: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [name, command] of Object.entries(scripts)) {
    if (BLOCKED_SCRIPTS.has(name)) {
      logger.warn(`Removing blocked script: ${name}`);
      continue;
    }

    if (ALLOWED_SCRIPTS.has(name)) {
      sanitized[name] = command;
    }
  }

  return sanitized;
}

export const SECURITY_CONFIG = {
  maxConcurrentPreviews: 5,
  maxDiskUsageMB: 500,
  maxProcessCount: 10,
  maxTimeoutMs: 300000,
  maxIdleMs: 600000,
  allowedPorts: { min: 10000, max: 60000 },
};
