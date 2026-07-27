# Embassy Management System - Full Implementation Plan

**Project:** Embassy Management System (EMS)  
**Stack:** Node.js/TypeScript, Express.js v5, Prisma ORM v7.9, PostgreSQL  
**Architecture:** Layered (DTO → Service → ServiceImpl → Controller → Route)  
**Validation:** validator.js  
**Auth:** JWT Access (15min) + Refresh (7d) tokens with DB rotation  
**Timeline:** 13 weeks / 5 phases

---

## 📁 Current Project State

```
embassy_mgt_system/
├── prisma/
│   ├── schema.prisma              ✅ Complete (14 models, 20+ enums)
│   └── migrations/                ✅ 2 migrations exist (init, gender_update)
├── src/
│   ├── config/
│   │   └── db.config.ts           ✅ Prisma + pg adapter singleton
│   ├── utils/
│   │   └── bcrypt.utilities.ts    ✅ bcrypt cost 12
│   ├── generated/prisma/          ✅ Prisma Client generated
│   ├── index.ts                   ⬜ Empty entry point
│   └── server.ts                  ⬜ Empty Express app
├── .env                           ✅ DATABASE_URL, PORT
├── package.json                   ✅ Dependencies installed
└── tsconfig.json                  ✅ ES2020, CommonJS, strict
```

---

## 🎯 Phase 1: Auth, Users, Roles, Audit (Weeks 1-2)

### Folder Structure to Create

```
src/
├── config/
│   └── db.config.ts               ✅ exists
├── dto/
│   ├── auth.dto.ts                # Register, Login, Refresh, ChangePassword
│   ├── user.dto.ts                # CreateUser, UpdateUser, UserResponse
│   ├── role.dto.ts                # CreateRole, UpdateRole, AssignPermissions
│   └── permission.dto.ts          # CreatePermission
├── services/
│   ├── auth.service.ts            # Interface
│   ├── auth.service.impl.ts       # Implementation
│   ├── user.service.ts
│   ├── user.service.impl.ts
│   ├── role.service.ts
│   ├── role.service.impl.ts
│   └── permission.service.ts
├── controllers/
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── role.controller.ts
│   └── permission.controller.ts
├── routes/
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── role.routes.ts
│   ├── permission.routes.ts
│   └── index.ts                   # Route aggregator
├── middleware/
│   ├── auth.middleware.ts         # JWT verify, attach user
│   ├── rbac.middleware.ts         # Permission/role guards
│   ├── validation.middleware.ts   # validator.js wrapper
│   ├── audit.middleware.ts        # Auto-audit logging
│   └── error.middleware.ts        # Global error handler
├── exceptions/
│   ├── AppError.ts                # Base class
│   ├── ValidationError.ts
│   ├── AuthenticationError.ts
│   ├── AuthorizationError.ts
│   ├── NotFoundError.ts
│   └── ConflictError.ts
├── utils/
│   ├── bcrypt.utilities.ts        ✅ exists
│   ├── jwt.utilities.ts           # NEW: sign/verify tokens
│   ├── crypto.utilities.ts        # NEW: token generation, encryption
│   └── validation.utils.ts        # NEW: validator.js helpers
├── enums/
│   └── http-status.ts             # HTTP status constants
├── server.ts                      # Express app setup
└── index.ts                       # Entry point
```

### File-by-File Implementation Details

#### 1. DTOs (`src/dto/*.dto.ts`)
Using `validator.js` with static validation methods.

```typescript
// auth.dto.ts
export class RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  
  static validate(data: any): string[] { /* validator.js checks */ }
}

export class LoginDto { email: string; password: string; }
export class RefreshDto { refreshToken: string; }
export class ChangePasswordDto { currentPassword: string; newPassword: string; }
```

#### 2. Exceptions (`src/exceptions/*.ts`)
```typescript
// AppError.ts
export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract isOperational: boolean;
  constructor(message: string) { super(message); }
}

// AuthenticationError.ts (401)
// AuthorizationError.ts (403)
// ValidationError.ts (400)
// NotFoundError.ts (404)
// ConflictError.ts (409)
```

#### 3. Utilities (`src/utils/*.ts`)
```typescript
// jwt.utilities.ts
export const signAccessToken = (payload: object) => jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' });
export const signRefreshToken = (payload: object) => jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
export const verifyAccessToken = (token: string) => jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
export const verifyRefreshToken = (token: string) => jwt.verify(token, process.env.JWT_REFRESH_SECRET!);

// validation.utils.ts
export const validateEmail = (email: string) => validator.isEmail(email);
export const validatePassword = (pwd: string) => validator.isStrongPassword(pwd, { minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 });
export const sanitizeInput = (input: string) => validator.escape(input.trim());
```

#### 4. Services (Interface + Impl pattern)
```typescript
// auth.service.ts
export interface IAuthService {
  register(dto: RegisterDto): Promise<AuthResponse>;
  login(dto: LoginDto): Promise<AuthResponse>;
  refresh(refreshToken: string): Promise<AuthResponse>;
  logout(userId: string): Promise<void>;
  changePassword(userId: string, dto: ChangePasswordDto): Promise<void>;
}

// auth.service.impl.ts
export class AuthService implements IAuthService {
  constructor(
    private userService: IUserService,
    private prisma: PrismaClient,
    private jwt: JwtUtils
  ) {}
  
  async register(dto) { /* hash, create user, create refresh token, return tokens */ }
  async login(dto) { /* verify, create tokens, store refresh */ }
  async refresh(token) { /* verify, rotate, store new, revoke old */ }
  async logout(userId) { /* revoke all refresh tokens */ }
}
```

#### 5. Controllers (Thin - delegate to services)
```typescript
// auth.controller.ts
export class AuthController {
  constructor(private authService: IAuthService) {}
  
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  };
  // login, refresh, logout, changePassword...
}
```

#### 6. Middleware
| Middleware | Purpose |
|------------|---------|
| `auth.middleware.ts` | Verify access token, attach `req.user`, check revoked |
| `rbac.middleware.ts` | `requirePermission('user:create')`, `requireRole('admin')` |
| `validation.middleware.ts` | `validate(RegisterDto)` - runs DTO.validate() |
| `audit.middleware.ts` | Auto-log create/update/delete on entity changes |
| `error.middleware.ts` | Global handler: formats AppError → JSON, logs unexpected |

#### 6. Routes
```typescript
// auth.routes.ts
router.post('/register', validate(RegisterDto), authController.register);
router.post('/login', validate(LoginDto), authController.login);
router.post('/refresh', validate(RefreshDto), authController.refresh);
router.post('/logout', authMiddleware, authController.logout);
router.post('/change-password', authMiddleware, validate(ChangePasswordDto), authController.changePassword);
```

#### 7. Server & Entry
```typescript
// server.ts
const app = express();
app.use(cors(), express.json());
app.use(auditMiddleware); // global
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use(errorMiddleware);
export default app;

// index.ts
import app from './server';
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
```

### Auth Flow Details

| Token | Lifetime | Storage | Rotation |
|-------|----------|---------|----------|
| Access Token | 15 min | HTTP-only cookie (or header) | Stateless |
| Refresh Token | 7 days | DB (`RefreshToken` table) + HTTP-only cookie | Rotate on use, revoke old |

**Secrets needed in `.env`:**
```
JWT_ACCESS_SECRET=your-256-bit-secret
JWT_REFRESH_SECRET=your-different-256-bit-secret
```

---

## 📦 Phase 2: Embassy, Departments, Service Types, Requests (Weeks 3-5)

### New Modules

| Module | DTOs | Service | Controller | Routes |
|--------|------|---------|------------|--------|
| Embassy | `embassy.dto.ts` | `embassy.service.ts` | `embassy.controller.ts` | `embassy.routes.ts` |
| Department | `department.dto.ts` | `department.service.ts` | `department.controller.ts` | `department.routes.ts` |
| ServiceType | `service-type.dto.ts` | `service-type.service.ts` | `service-type.controller.ts` | `service-type.routes.ts` |
| ServiceRequest | `service-request.dto.ts` | `service-request.service.ts` | `service-request.controller.ts` | `service-request.routes.ts` |

### Key Features
- Embassy CRUD + code uniqueness
- Department scoped to embassy
- ServiceType with categories (PASSPORT, VISA, etc.), fees, duration
- ServiceRequest with reference numbers, status machine (DRAFT→SUBMITTED→IN_PROGRESS→COMPLETED/CLOSED/CANCELLED)
- Payment record creation when fee > 0

---

## 🎫 Phase 3: Visa Processing, Appointments (Weeks 6-8)

### New Modules

| Module | DTOs | Service | Controller | Routes |
|--------|------|---------|------------|--------|
| VisaApplication | `visa-application.dto.ts` | `visa-application.service.ts` | `visa-application.controller.ts` | `visa-application.routes.ts` |
| VisaDocument | `visa-document.dto.ts` | `visa-document.service.ts` | `visa-document.controller.ts` | `visa-document.routes.ts` |
| VisaDecision | `visa-decision.dto.ts` | `visa-decision.service.ts` | `visa-decision.controller.ts` | `visa-decision.routes.ts` |
| VerificationCheck | `verification-check.dto.ts` | `verification-check.service.ts` | `verification-check.controller.ts` | `verification-check.routes.ts` |
| Appointment | `appointment.dto.ts` | `appointment.service.ts` | `appointment.controller.ts` | `appointment.routes.ts` |

### Key Features
- Visa types: TOURIST, BUSINESS, WORK, STUDENT, DIPLOMATIC, TRANSIT, MEDIA, MEDICAL, FAMILY_REUNION
- Status flow: DRAFT→SUBMITTED→UNDER_REVIEW→MORE_INFO_REQUESTED→APPROVED/REJECTED/ESCALATED→ISSUED
- Dual-approval for high-stakes (REJECT/ESCALATE_TO_HQ needs secondary officer)
- Automated vetting against `WatchlistEntry` (CLEARED/FLAGGED/ERROR)
- Appointment booking with QR code, OTP verification, queue token, check-in flow

---

## 🛡️ Phase 4: Legalization, Emergency, Diplomatic, Financial (Weeks 9-11)

### New Modules

| Domain | Models | Key Features |
|--------|--------|--------------|
| **Document Legalization** | ServiceType (DOCUMENT_LEGALIZATION), ServiceRequest | Hague Convention routing, apostille vs legalization, document chain |
| **Emergency Services** | EmergencyCase | Crisis registration, urgency levels, evacuation prioritization, alerts |
| **Diplomatic Logistics** | DiplomaticPouch, StaffClearance | Chain-of-custody, pouch tracking, clearance levels (L1-L5) |
| **Financial Ledger** | Payment, ServiceType.fee | Daily reconciliation, monthly reports, refund handling, multi-currency |

### Integration Points
- All phases use **AuditLog** middleware (auto-logging)
- All phases use **RBAC** middleware (permission checks)
- All phases use **Validation** middleware (DTO validation)

---

## 🧪 Phase 5: Testing, Security, Documentation (Weeks 12-13)

### Testing

| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit | Jest + ts-jest | Services (80%+) |
| Integration | Jest + Supertest | Controllers/Routes (70%+) |
| E2E | Jest + Supertest | Critical flows (auth, visa, payments) |

### Security Hardening
- Rate limiting: 100 req/min/IP, 1000 req/min/user
- CORS: Restricted to embassy domains
- Helmet.js headers
- Input sanitization on all DTOs
- SQL injection prevention (Prisma handles)
- PII encryption at rest (AES-256-GCM via crypto utilities)

### Observability
- Structured JSON logging with correlation IDs
- Health check endpoint: `GET /health`
- Metrics: request latency, error rates, DB pool usage

### Documentation
- OpenAPI/Swagger spec at `/api/docs`
- Postman collection export
- Deployment guide (Docker, PM2, Nginx)

---

## 🗄️ Database & Migration Strategy

| Action | Command |
|--------|---------|
| Apply existing migrations | `npx prisma migrate deploy --schema=prisma/schema.prisma` |
| Create new migration | `npx prisma migrate dev --name <name> --schema=prisma/schema.prisma` |
| Generate client after schema change | `npx prisma generate --schema=prisma/schema.prisma` |
| Open Prisma Studio | `npx prisma studio --schema=prisma/schema.prisma` |

**Current state**: 2 migrations exist (`init`, `gender_update`) — ready to deploy.

---

## ⚙️ Environment Variables Needed

```env
# Database
DATABASE_URL="postgresql://postgres:XLR8*xlr8%26@localhost:5433/embassy_mgt_system?schema=public"

# Server
PORT=3010
NODE_ENV=development

# JWT
JWT_ACCESS_SECRET="your-256-bit-base64-secret-here"
JWT_REFRESH_SECRET="your-different-256-bit-base64-secret-here"

# Future (Phase 4+)
REDIS_URL="redis://localhost:6379"
S3_ENDPOINT="http://localhost:9000"
S3_BUCKET="embassy-docs"
SMTP_HOST="smtp.example.com"
SMS_API_KEY="your-sms-key"
VAULT_ADDR="http://localhost:8200"
```

---

## ✅ Approval Checkpoint

**Confirmed:**
1. ✅ Layered architecture (DTO → Service → Impl → Controller → Route) — matches your preference
2. ✅ validator.js for validation (already in deps)
3. ✅ JWT Access + Refresh tokens with DB rotation
4. ✅ Existing migrations applied before coding
5. ✅ Phase 1 scope: Auth, Users, Roles, Permissions, Audit

**Next Step:** Begin Phase 1 implementation file-by-file.