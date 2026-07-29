import { PrismaClient } from '../generated/prisma/client';

export interface DashboardStats {
  /** System-wide totals (admin) */
  totalUsers?: number;
  newUsersThisWeek?: number;
  totalVisas?: number;
  totalAppointments?: number;
  totalServiceRequests?: number;
  totalEmbassies?: number;
  /** Queue items (admin + officer) */
  pendingVisas?: number;
  pendingServiceRequests?: number;
  todayAppointments?: number;
  pendingVisaDecisions?: number;
  /** Personal items (all roles) */
  myPendingVisas?: number;
  myUpcomingAppointments?: number;
  myRecentServiceRequests?: number;
  /** Chart data */
  charts?: ChartDataset;
}

export interface ChartDataset {
  visaTrend: { date: string; count: number; status: string }[];
  appointmentTrend: { date: string; count: number; status: string }[];
  visaByType: { visaType: string; count: number }[];
  appointmentsByStatus: { status: string; count: number }[];
  serviceRequestsByStatus: { status: string; count: number }[];
  topEmbassies: { name: string; count: number }[];
}

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  async getAdminStats(): Promise<DashboardStats> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersThisWeek,
      totalVisas,
      totalAppointments,
      totalServiceRequests,
      totalEmbassies,
      pendingVisas,
      pendingServiceRequests,
      todayAppointments,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.visaApplication.count(),
      this.prisma.appointment.count(),
      this.prisma.serviceRequest.count(),
      this.prisma.embassy.count(),
      this.prisma.visaApplication.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.serviceRequest.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.appointment.count({
        where: { slotDate: { gte: todayStart, lt: todayEnd } },
      }),
    ]);

    return {
      totalUsers,
      newUsersThisWeek,
      totalVisas,
      totalAppointments,
      totalServiceRequests,
      totalEmbassies,
      pendingVisas,
      pendingServiceRequests,
      todayAppointments,
    };
  }

  async getOfficerStats(): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [pendingVisaDecisions, todayAppointments, pendingServiceRequests] =
      await Promise.all([
        this.prisma.visaApplication.count({
          where: {
            status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
          },
        }),
        this.prisma.appointment.count({
          where: { slotDate: { gte: todayStart, lt: todayEnd } },
        }),
        this.prisma.serviceRequest.count({ where: { status: 'SUBMITTED' } }),
      ]);

    return {
      pendingVisaDecisions,
      todayAppointments,
      pendingServiceRequests,
    };
  }

  async getUserStats(userId: string): Promise<DashboardStats> {
    const [myPendingVisas, myUpcomingAppointments, myRecentServiceRequests] =
      await Promise.all([
        this.prisma.visaApplication.count({
          where: {
            userId,
            status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
          },
        }),
        this.prisma.appointment.count({
          where: {
            userId,
            slotDate: { gte: new Date() },
            status: { not: 'CANCELLED' },
          },
        }),
        this.prisma.serviceRequest.count({
          where: { userId, status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED'] } },
        }),
      ]);

    return { myPendingVisas, myUpcomingAppointments, myRecentServiceRequests };
  }

  async getAll(userId: string, roleSlug: string): Promise<DashboardStats> {
    const personal = await this.getUserStats(userId);

    if (roleSlug === 'admin') {
      const admin = await this.getAdminStats();
      return { ...personal, ...admin };
    }

    if (roleSlug === 'officer') {
      const officer = await this.getOfficerStats();
      return { ...personal, ...officer };
    }

    return personal;
  }

  async getChartData(startDate?: string, endDate?: string): Promise<ChartDataset> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const [visaTrend, appointmentTrend] = await Promise.all([
      this.prisma.$queryRawUnsafe<{ date: string; count: bigint; status: string }[]>(
        `SELECT DATE("createdAt") as date, COUNT(*)::int as count, "status"
         FROM "VisaApplication"
         WHERE "createdAt"::date >= $1::date AND "createdAt"::date <= $2::date
         GROUP BY DATE("createdAt"), "status"
         ORDER BY date ASC`,
        start, end
      ),
      this.prisma.$queryRawUnsafe<{ date: string; count: bigint; status: string }[]>(
        `SELECT DATE("createdAt") as date, COUNT(*)::int as count, "status"
         FROM "Appointment"
         WHERE "createdAt"::date >= $1::date AND "createdAt"::date <= $2::date
         GROUP BY DATE("createdAt"), "status"
         ORDER BY date ASC`,
        start, end
      ),
    ]);

    const dateFilter = {
      createdAt: {
        gte: new Date(start),
        lte: new Date(end + 'T23:59:59.999Z'),
      },
    };

    const [visaByType, appointmentsByStatus, serviceRequestsByStatus, topEmbassies] =
      await Promise.all([
        this.prisma.visaApplication.groupBy({
          by: ['visaType'],
          _count: { id: true },
          where: dateFilter,
        }),
        this.prisma.appointment.groupBy({
          by: ['status'],
          _count: { id: true },
          where: dateFilter,
        }),
        this.prisma.serviceRequest.groupBy({
          by: ['status'],
          _count: { id: true },
          where: dateFilter,
        }),
        this.prisma.embassy.findMany({
          select: {
            name: true,
            _count: { select: { visaApplications: true } },
          },
          orderBy: { visaApplications: { _count: 'desc' } },
          take: 5,
        }),
      ]);

    return {
      visaTrend: visaTrend.map((r) => ({ date: r.date, count: Number(r.count), status: r.status })),
      appointmentTrend: appointmentTrend.map((r) => ({ date: r.date, count: Number(r.count), status: r.status })),
      visaByType: visaByType.map((r) => ({ visaType: r.visaType, count: r._count.id })),
      appointmentsByStatus: appointmentsByStatus.map((r) => ({ status: r.status, count: r._count.id })),
      serviceRequestsByStatus: serviceRequestsByStatus.map((r) => ({ status: r.status, count: r._count.id })),
      topEmbassies: topEmbassies.map((r) => ({ name: r.name, count: r._count.visaApplications })),
    };
  }
}