import validator from 'validator';

export class RecordTransactionDto {
  serviceRequestId?: string;
  visaApplicationId?: string;
  amount!: number;
  currency!: string;
  paymentMethod?: string;
  transactionId?: string;
  userId!: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (data.serviceRequestId !== undefined && data.serviceRequestId !== null) {
      if (typeof data.serviceRequestId !== 'string') {
        errors.push('Service request ID must be a string');
      } else if (!validator.isUUID(data.serviceRequestId)) {
        errors.push('Service request ID must be a valid UUID');
      }
    }

    if (data.visaApplicationId !== undefined && data.visaApplicationId !== null) {
      if (typeof data.visaApplicationId !== 'string') {
        errors.push('Visa application ID must be a string');
      } else if (!validator.isUUID(data.visaApplicationId)) {
        errors.push('Visa application ID must be a valid UUID');
      }
    }

    if (data.visaApplicationId && data.serviceRequestId) {
      errors.push('Only one of serviceRequestId or visaApplicationId should be provided');
    }

    if (!data.serviceRequestId && !data.visaApplicationId) {
      errors.push('Either serviceRequestId or visaApplicationId must be provided');
    }

    if (data.amount === undefined || data.amount === null || typeof data.amount !== 'number') {
      errors.push('Amount is required and must be a number');
    } else if (data.amount <= 0) {
      errors.push('Amount must be a positive number');
    }

    if (!data.currency || typeof data.currency !== 'string') {
      errors.push('Currency is required');
    } else if (data.currency.length !== 3) {
      errors.push('Currency must be a 3-letter code');
    }

    if (data.paymentMethod !== undefined && data.paymentMethod !== null && typeof data.paymentMethod !== 'string') {
      errors.push('Payment method must be a string');
    }

    if (data.transactionId !== undefined && data.transactionId !== null && typeof data.transactionId !== 'string') {
      errors.push('Transaction ID must be a string');
    }

    if (!data.userId || typeof data.userId !== 'string') {
      errors.push('User ID is required');
    } else if (!validator.isUUID(data.userId)) {
      errors.push('User ID must be a valid UUID');
    }

    return errors;
  }

  static sanitize(data: any): RecordTransactionDto {
    const dto = new RecordTransactionDto();
    dto.serviceRequestId = data.serviceRequestId?.trim() || undefined;
    dto.visaApplicationId = data.visaApplicationId?.trim() || undefined;
    dto.amount = typeof data.amount === 'number' ? data.amount : parseFloat(data.amount);
    dto.currency = data.currency?.trim().toUpperCase();
    dto.paymentMethod = data.paymentMethod?.trim() || undefined;
    dto.transactionId = data.transactionId?.trim() || undefined;
    dto.userId = data.userId?.trim();
    return dto;
  }
}

export class TransactionResponseDto {
  id!: string;
  serviceRequestId?: string;
  visaApplicationId?: string;
  userId!: string;
  amount!: number;
  currency!: string;
  status!: string;
  paymentMethod?: string;
  transactionId?: string;
  paidAt?: Date;
  createdAt!: Date;
}

export class DailyReconciliationDto {
  date!: string;
  totalCollections!: number;
  totalTransactions!: number;
  paymentsByStatus!: Record<string, number>;
  discrepancyCount!: number;
}

export class MonthlyReportDto {
  month!: number;
  year!: number;
  totalCollections!: number;
  totalTransactions!: number;
  byService!: Record<string, { count: number; total: number }>;
  byCurrency!: Record<string, { count: number; total: number }>;
  byOfficer!: Record<string, { count: number; total: number }>;
}

export class PaginatedTransactionsDto {
  data!: TransactionResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}