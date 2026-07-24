import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { observeHttpRequest } from './metrics';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const { method, path: reqPath } = req;

  const originalEnd = res.end;
  res.end = function (this: Response, ...args: any[]) {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode;

    logger.info('Request completed', {
      method,
      path: reqPath,
      statusCode,
      duration: `${duration.toFixed(3)}s`,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    observeHttpRequest(method, reqPath, statusCode, duration);

    return originalEnd.apply(this, args as any);
  } as any;

  next();
}
