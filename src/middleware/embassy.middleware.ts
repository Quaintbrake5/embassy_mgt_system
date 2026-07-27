import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.config';
import { getUserPermissions } from './rbac.middleware';

declare global {
  namespace Express {
    interface Request {
      embassyContext?: {
        embassyId: string;
        embassyCode: string;
      };
    }
  }
}

export const resolveEmbassyContext = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const embassyCode = req.headers['x-embassy-code'] as string;

    if (embassyCode) {
      if (!req.user) {
        next();
        return;
      }

      const permissions = await getUserPermissions(req.user.userId);
      const hasEmbassyAccess = permissions.some((p) => p.startsWith('embassy:'));
      if (!hasEmbassyAccess) {
        next();
        return;
      }

      const embassy = await prisma.embassy.findUnique({
        where: { code: embassyCode },
      });

      if (embassy) {
        req.embassyContext = {
          embassyId: embassy.id,
          embassyCode: embassy.code,
        };
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};