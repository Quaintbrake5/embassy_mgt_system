import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { prisma } from '../config/db.config';

const dashboardService = new DashboardService(prisma);

export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { userid: userId },
      select: { role: { select: { slug: true } } },
    });

    const roleSlug = user?.role?.slug || 'viewer';
    const stats = await dashboardService.getAll(userId, roleSlug);

    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    let charts = undefined;
    if (roleSlug === 'admin' || roleSlug === 'officer') {
      charts = await dashboardService.getChartData(startDate, endDate);
    }

    res.json({ success: true, data: { ...stats, charts } });
  } catch (error) {
    next(error);
  }
};