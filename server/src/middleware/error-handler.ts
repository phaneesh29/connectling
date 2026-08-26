import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError, treeifyError } from 'zod';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: treeifyError(err),
    });
  }

  if (err instanceof AppError) {
    logger.warn({ err }, err.message);
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  logger.error({ err }, err.message);
  return res.status(500).json({
    success: false,
    error: 'Internal Server Error',
  });
};
