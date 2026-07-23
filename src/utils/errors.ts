export enum ErrorCode {
  // URL 相关错误
  INVALID_URL = 'INVALID_URL',
  NOT_GITHUB_URL = 'NOT_GITHUB_URL',

  // 仓库相关错误
  REPO_NOT_FOUND = 'REPO_NOT_FOUND',
  REPO_PRIVATE = 'REPO_PRIVATE',
  REPO_ARCHIVED = 'REPO_ARCHIVED',

  // API 相关错误
  GITHUB_RATE_LIMIT = 'GITHUB_RATE_LIMIT',
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',

  // 克隆相关错误
  CLONE_FAILED = 'CLONE_FAILED',
  CLONE_TIMEOUT = 'CLONE_TIMEOUT',
  DISK_SPACE不足 = 'DISK_SPACE不足',

  // 截图相关错误
  SCREENSHOT_FAILED = 'SCREENSHOT_FAILED',
  BROWSER_CRASHED = 'BROWSER_CRASHED',

  // 系统错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export function createError(code: ErrorCode, message: string, details?: any): AppError {
  const statusCodeMap: Record<ErrorCode, number> = {
    [ErrorCode.INVALID_URL]: 400,
    [ErrorCode.NOT_GITHUB_URL]: 400,
    [ErrorCode.REPO_NOT_FOUND]: 404,
    [ErrorCode.REPO_PRIVATE]: 403,
    [ErrorCode.REPO_ARCHIVED]: 410,
    [ErrorCode.GITHUB_RATE_LIMIT]: 429,
    [ErrorCode.GITHUB_API_ERROR]: 502,
    [ErrorCode.CLONE_FAILED]: 500,
    [ErrorCode.CLONE_TIMEOUT]: 504,
    [ErrorCode.DISK_SPACE不足]: 507,
    [ErrorCode.SCREENSHOT_FAILED]: 500,
    [ErrorCode.BROWSER_CRASHED]: 500,
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  };

  return new AppError(message, code, statusCodeMap[code] || 500, details);
}
