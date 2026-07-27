import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.config';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        roleId?: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT access token and attaches user to request
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token format',
        },
      });
      return;
    }

    // Import jwt utilities dynamically to avoid circular dependency
    const { verifyAccessToken } = await import('../utils/jwt.utilities');
    const payload = verifyAccessToken(token);

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { userid: payload.userId },
      select: { userid: true, status: true, roleId: true, email: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
        },
      });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Account is not active',
        },
      });
      return;
    }

    // Attach user to request
    req.user = {
      userId: user.userid,
      email: user.email,
      roleId: user.roleId ?? undefined,
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        },
      });
      return;
    }
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expired',
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if valid token provided, otherwise continues without user
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const { verifyAccessToken } = await import('../utils/jwt.utilities');
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { userid: payload.userId },
      select: { userid: true, status: true, roleId: true, email: true },
    });

    if (user && user.status === 'ACTIVE') {
      req.user = {
        userId: user.userid,
        email: user.email,
        roleId: user.roleId ?? undefined,
      };
    }

    next();
  } catch {
    // Ignore auth errors for optional auth
    next();
  }
};