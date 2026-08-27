import type { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, type User, type Session } from '../auth.js';
import { UnauthorizedError } from '../utils/app-error.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session['session'];
    }
  }
}

export const requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!sessionData) {
      return next(new UnauthorizedError('Unauthorized'));
    }

    req.user = sessionData.user;
    req.session = sessionData.session;

    next();
  } catch (error) {
    next(error);
  }
};
