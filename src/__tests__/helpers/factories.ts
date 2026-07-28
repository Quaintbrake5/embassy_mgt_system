export function createMockUser(overrides: Record<string, any> = {}) {
  return {
    userid: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: null,
    passwordHash: 'hashed-password',
    status: 'ACTIVE',
    emailVerified: false,
    roleId: null,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockRole(overrides: Record<string, any> = {}) {
  return {
    id: 'role-1',
    name: 'Officer',
    slug: 'officer',
    description: 'Embassy officer',
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockPermission(overrides: Record<string, any> = {}) {
  return {
    id: 'perm-1',
    name: 'Read Users',
    slug: 'user:read',
    description: 'Can read users',
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockRefreshToken(overrides: Record<string, any> = {}) {
  return {
    id: 'rt-1',
    token: 'hashed-refresh-token',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revoked: false,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockAuditLog(overrides: Record<string, any> = {}) {
  return {
    id: 'log-1',
    userId: 'user-1',
    action: 'CREATE',
    entity: 'User',
    entityId: 'user-1',
    description: 'CREATE User',
    metaData: null,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    correlationId: 'test-correlation-id',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockEmbassy(overrides: Record<string, any> = {}) {
  return {
    id: 'embassy-1',
    name: 'Test Embassy',
    code: 'TEST',
    address: '123 Test St',
    city: 'Test City',
    country: 'Test Country',
    phone: '+1234567890',
    email: 'embassy@test.com',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockDepartment(overrides: Record<string, any> = {}) {
  return {
    id: 'dept-1',
    name: 'Consular Services',
    code: 'CONS',
    description: 'Consular services department',
    embassyId: 'embassy-1',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockServiceType(overrides: Record<string, any> = {}) {
  return {
    id: 'st-1',
    name: 'Passport Renewal',
    slug: 'passport-renewal',
    description: 'Renew expiring passport',
    category: 'DOCUMENT',
    fee: 100.00,
    currency: 'USD',
    duration: 10,
    requiresAppointment: true,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockServiceRequest(overrides: Record<string, any> = {}) {
  return {
    id: 'sr-1',
    referenceNumber: 'SR-TEST-123',
    userId: 'user-1',
    serviceTypeId: 'st-1',
    status: 'SUBMITTED',
    details: {},
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockVisaApplication(overrides: Record<string, any> = {}) {
  return {
    id: 'visa-1',
    applicationNumber: 'VA-TEST-123',
    userId: 'user-1',
    visaType: 'TOURIST',
    status: 'UNDER_REVIEW',
    formData: {},
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockPayment(overrides: Record<string, any> = {}) {
  return {
    id: 'pay-1',
    serviceRequestId: 'sr-1',
    visaApplicationId: null,
    userId: 'user-1',
    amount: 100.00,
    currency: 'USD',
    status: 'COMPLETED',
    paymentMethod: 'CARD',
    transactionId: 'txn-1',
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockEmergencyCase(overrides: Record<string, any> = {}) {
  return {
    id: 'ec-1',
    caseNumber: 'EC-TEST-123',
    userId: 'user-1',
    status: 'OPEN',
    urgency: 'HIGH',
    location: { lat: 1.23, lng: 4.56 },
    details: {},
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockDiplomaticPouch(overrides: Record<string, any> = {}) {
  return {
    id: 'dp-1',
    pouchNumber: 'DP-TEST-123',
    originEmbassyId: 'embassy-1',
    destinationEmbassyId: 'embassy-2',
    status: 'CREATED',
    chainOfCustody: [],
    dispatchDate: null,
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockAppointment(overrides: Record<string, any> = {}) {
  return {
    id: 'apt-1',
    appointmentDate: new Date(Date.now() + 86400000),
    startTime: '09:00',
    endTime: '09:30',
    userId: 'user-1',
    serviceTypeId: 'st-1',
    status: 'CONFIRMED',
    token: 'TK-TEST-123',
    otpCode: '123456',
    otpExpiresAt: new Date(Date.now() + 300000),
    otpVerified: false,
    windowNumber: null,
    checkInAt: null,
    completedAt: null,
    noShowAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockWatchlistEntry(overrides: Record<string, any> = {}) {
  return {
    id: 'wl-1',
    fullName: 'John Doe',
    documentNumber: 'AB123456',
    nationality: 'TEST',
    riskLevel: 'MEDIUM',
    reason: 'Test entry',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockVerificationCheck(overrides: Record<string, any> = {}) {
  return {
    id: 'vc-1',
    visaApplicationId: 'visa-1',
    checkType: 'WATCHLIST',
    status: 'CLEAR',
    riskScore: 'LOW',
    findings: null,
    checkedBy: null,
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockProfile(overrides: Record<string, any> = {}) {
  return {
    id: 'prof-1',
    userId: 'user-1',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'MALE',
    nationality: 'TEST',
    passportNumber: 'PP123456',
    address: '123 Main St',
    city: 'Test City',
    postalCode: '12345',
    country: 'Test Country',
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '+9876543210',
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    ...overrides,
  };
}

export const mockJwtUtilities = {
  signAccessToken: jest.fn(() => 'mock-access-token'),
  signRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'john@example.com' })),
  verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })),
};

export const mockBcryptUtilities = {
  hashPassword: jest.fn(() => 'hashed-password'),
  comparePassword: jest.fn(() => true),
};

export const mockCryptoUtilities = {
  generateToken: jest.fn(() => 'reset-token-123'),
  hashToken: jest.fn(() => 'hashed-reset-token'),
};