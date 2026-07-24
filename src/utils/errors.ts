export enum ErrorCode {
  // URL 相关错误
  INVALID_URL = 'INVALID_URL',
  NOT_GITHUB_URL = 'NOT_GITHUB_URL',
  URL_TOO_LONG = 'URL_TOO_LONG',

  // 仓库相关错误
  REPO_NOT_FOUND = 'REPO_NOT_FOUND',
  REPO_PRIVATE = 'REPO_PRIVATE',
  REPO_ARCHIVED = 'REPO_ARCHIVED',
  REPO_EMPTY = 'REPO_EMPTY',

  // API 相关错误
  GITHUB_RATE_LIMIT = 'GITHUB_RATE_LIMIT',
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  GITHUB_TOKEN_INVALID = 'GITHUB_TOKEN_INVALID',

  // 克隆相关错误
  CLONE_FAILED = 'CLONE_FAILED',
  CLONE_TIMEOUT = 'CLONE_TIMEOUT',
  CLONE_DISK_FULL = 'CLONE_DISK_FULL',

  // 预览相关错误
  PREVIEW_FAILED = 'PREVIEW_FAILED',
  PREVIEW_TIMEOUT = 'PREVIEW_TIMEOUT',
  PREVIEW_NOT_FOUND = 'PREVIEW_NOT_FOUND',
  PREVIEW_LIMIT_EXCEEDED = 'PREVIEW_LIMIT_EXCEEDED',

  // 截图相关错误
  SCREENSHOT_FAILED = 'SCREENSHOT_FAILED',
  BROWSER_CRASHED = 'BROWSER_CRASHED',

  // 项目检测错误
  PROJECT_TYPE_UNKNOWN = 'PROJECT_TYPE_UNKNOWN',
  BUILD_FAILED = 'BUILD_FAILED',
  START_FAILED = 'START_FAILED',

  // 系统错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DISK_QUOTA_EXCEEDED = 'DISK_QUOTA_EXCEEDED',
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_URL]: '请输入有效的 URL',
  [ErrorCode.NOT_GITHUB_URL]: '请输入 GitHub 仓库 URL',
  [ErrorCode.URL_TOO_LONG]: 'URL 过长，请缩短后重试',

  [ErrorCode.REPO_NOT_FOUND]: '仓库不存在或已被删除',
  [ErrorCode.REPO_PRIVATE]: '这是私有仓库，无法预览',
  [ErrorCode.REPO_ARCHIVED]: '仓库已归档，可能无法正常构建',
  [ErrorCode.REPO_EMPTY]: '仓库为空，没有可预览的内容',

  [ErrorCode.GITHUB_RATE_LIMIT]: 'GitHub API 请求过于频繁，请稍后重试',
  [ErrorCode.GITHUB_API_ERROR]: 'GitHub API 请求失败，请稍后重试',
  [ErrorCode.GITHUB_TOKEN_INVALID]: 'GitHub Token 无效',

  [ErrorCode.CLONE_FAILED]: '克隆仓库失败，请检查 URL 是否正确',
  [ErrorCode.CLONE_TIMEOUT]: '克隆超时，仓库可能太大',
  [ErrorCode.CLONE_DISK_FULL]: '磁盘空间不足，无法克隆',

  [ErrorCode.PREVIEW_FAILED]: '预览创建失败',
  [ErrorCode.PREVIEW_TIMEOUT]: '预览超时，项目可能启动失败',
  [ErrorCode.PREVIEW_NOT_FOUND]: '预览不存在或已过期',
  [ErrorCode.PREVIEW_LIMIT_EXCEEDED]: '同时预览数已达上限，请稍后重试',

  [ErrorCode.SCREENSHOT_FAILED]: '截图失败',
  [ErrorCode.BROWSER_CRASHED]: '浏览器崩溃，请重试',

  [ErrorCode.PROJECT_TYPE_UNKNOWN]: '无法识别项目类型',
  [ErrorCode.BUILD_FAILED]: '项目构建失败',
  [ErrorCode.START_FAILED]: '项目启动失败',

  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求过于频繁，请稍后重试',
  [ErrorCode.DISK_QUOTA_EXCEEDED]: '服务器磁盘空间不足',
};

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
        userMessage: ERROR_MESSAGES[this.code] || this.message,
        details: this.details,
      },
    };
  }
}

const STATUS_CODE_MAP: Record<ErrorCode, number> = {
  [ErrorCode.INVALID_URL]: 400,
  [ErrorCode.NOT_GITHUB_URL]: 400,
  [ErrorCode.URL_TOO_LONG]: 400,
  [ErrorCode.REPO_NOT_FOUND]: 404,
  [ErrorCode.REPO_PRIVATE]: 403,
  [ErrorCode.REPO_ARCHIVED]: 410,
  [ErrorCode.REPO_EMPTY]: 404,
  [ErrorCode.GITHUB_RATE_LIMIT]: 429,
  [ErrorCode.GITHUB_API_ERROR]: 502,
  [ErrorCode.GITHUB_TOKEN_INVALID]: 401,
  [ErrorCode.CLONE_FAILED]: 500,
  [ErrorCode.CLONE_TIMEOUT]: 504,
  [ErrorCode.CLONE_DISK_FULL]: 507,
  [ErrorCode.PREVIEW_FAILED]: 500,
  [ErrorCode.PREVIEW_TIMEOUT]: 504,
  [ErrorCode.PREVIEW_NOT_FOUND]: 404,
  [ErrorCode.PREVIEW_LIMIT_EXCEEDED]: 429,
  [ErrorCode.SCREENSHOT_FAILED]: 500,
  [ErrorCode.BROWSER_CRASHED]: 500,
  [ErrorCode.PROJECT_TYPE_UNKNOWN]: 422,
  [ErrorCode.BUILD_FAILED]: 500,
  [ErrorCode.START_FAILED]: 500,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.DISK_QUOTA_EXCEEDED]: 507,
};

export function createError(code: ErrorCode, message?: string, details?: any): AppError {
  const finalMessage = message || ERROR_MESSAGES[code] || 'Unknown error';
  return new AppError(finalMessage, code, STATUS_CODE_MAP[code] || 500, details);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorCode(error: unknown): ErrorCode {
  if (isAppError(error)) {
    return error.code;
  }
  return ErrorCode.INTERNAL_ERROR;
}

export function getUserFriendlyMessage(error: unknown): string {
  if (isAppError(error)) {
    return ERROR_MESSAGES[error.code] || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
}
