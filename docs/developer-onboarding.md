# Developer Onboarding Guide

## Project Overview

Embassy Management System (EMS) is a Node.js/TypeScript backend providing RESTful APIs for embassy consular services. Built with Express 5 + Prisma 7.9 + PostgreSQL 15+.

### Domain Modules

| Module | API Prefix | Description |
|--------|-----------|-------------|
| Auth | `/auth` | Registration, login, token refresh, password management |
| Users | `/users` | User CRUD and role assignment |
| Roles/Permissions | `/roles`, `/permissions` | RBAC management |
| Profile | `/profile` | Citizen profile (GDPR-compliant) |
| Embassies | `/embassies` | Embassy and department management |
| Service Types | `/service-types` | Consular service catalog |
| Service Requests | `/service-requests` | Citizen service request lifecycle |
| Visa | `/visa` | Application, documents, decisions |
| Appointments | `/appointments` | Booking, queue, check-in |
| Legalization | `/legalization` | Document legalization workflow |
| Emergency | `/emergency` | Case management and alerts |
| Diplomatic | `/diplomatic` | Pouch tracking and staff clearances |
| Financial | `/financial` | Payments and reconciliation |
| Audit | `/audit` | Mutation audit log |

## Architecture

```
src/
├── config/          # App configuration (DB, Redis, logger, metrics, swagger)
├── controllers/     # Request handlers (thin layer)
├── dto/             # Validation schemas (class-validator)
├── exceptions/      # Custom error classes (AppError, NotFoundError, etc.)
├── generated/       # Prisma Client (auto-generated, do not edit)
│   └── prisma/
├── middleware/      # Express middleware (auth, RBAC, audit, error, validation, metrics)
├── routes/          # Route definitions (one file per resource)
├── services/        # Business logic layer
├── utils/           # Utilities (JWT, bcrypt, encryption)
├── types/           # TypeScript type definitions
├── __tests__/       # Test suites (mirrors service/controller structure)
├── index.ts         # Entry point (server startup, graceful shutdown)
└── server.ts        # Express app configuration (middleware, routes, background tasks)
```

### Layering Convention

```
Route (HTTP mapping) → Controller (request parsing, response formatting)
                     → Service (business logic, DB queries via Prisma)
                     → DTO (input validation)
```

Middleware sits between the client and controllers:
1. `cors` + `helmet` — security headers
2. Rate limiter — 100 req/min general, 20 req/15min auth
3. Correlation ID — UUID per request
4. `requestLogger` — structured request logging
5. `metricsMiddleware` — Prometheus metrics
6. JSON body parser
7. `authMiddleware` — JWT verification
8. `auditMiddleware` — mutation audit logging
9. `validate(dto)` — request body validation
10. `requirePermission(slug)` / `requireRole(slug)` — RBAC enforcement

## Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd embassy_mgt_system
npm install

# 2. Start infrastructure (Docker)
docker compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env with your database URL and JWT secrets

# 4. Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# 5. Run migrations
npx prisma migrate dev --schema=prisma/schema.prisma --name init

# 6. Seed data
npx prisma db seed

# 7. Start development server
npm run dev
```

## Coding Conventions

### Naming

| Convention | Pattern | Example |
|-----------|---------|---------|
| Models | PascalCase, singular | `ServiceRequest`, `VisaApplication` |
| Files | kebab-case | `visa-application.service.ts` |
| Functions/Methods | camelCase | `findByUserId()` |
| Variables | camelCase | `serviceTypeId` |
| Enums | PascalCase | `VisaStatus`, `RequestStatus` |
| Enum values | UPPER_SNAKE_CASE | `UNDER_REVIEW`, `IN_PROGRESS` |
| Routes | kebab-case, plural | `/api/v1/service-requests` |
| DB columns | camelCase | `createdAt`, `referenceNumber` |

### File Structure per Domain

```
src/
├── routes/<domain>.routes.ts        # Express Router with endpoint definitions
├── controllers/<domain>.controller.ts  # Request/response handling
├── services/<domain>.service.ts       # Business logic
├── dto/<domain>.dto.ts               # Validation DTOs (class-validator)
└── __tests__/<domain>/               # Test files
```

### API Response Format

Success:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "details": {}
  }
}
```

### Error Handling

Use custom error classes from `src/exceptions/`:
- `AppError` — base class
- `NotFoundError` → 404
- `ValidationError` → 400
- `AuthenticationError` → 401
- `AuthorizationError` → 403
- `ConflictError` → 409

Throw these in services; they're caught by `errorMiddleware`.

### Validation

DTO classes use `class-validator` decorators:
- Use `@IsOptional()` for optional fields
- Use `@IsString()`, `@IsEmail()`, `@IsEnum()`, etc.
- Use `@MinLength()` / `@MaxLength()` for string constraints
- DTOs are applied via `validate(dtoClass)` middleware

### Authentication & Authorization

- `authMiddleware` — verifies JWT Bearer token, attaches `req.user`
- `requirePermission(slug)` — checks user has `{resource}:{action}` permission
- `requireRole(slug)` — checks user has specific role
- Permission slug pattern: `resource:action` (e.g., `user:create`, `visa:read`)
- Embassy-scoped routes use `resolveEmbassyContext` middleware with `X-Embassy-Code` header

### Database Access

- **Never import `@prisma/client`** — always import from `../generated/prisma/client`
- Prisma queries go in service layer, never in controllers
- Use `$transaction` for multi-step operations
- The `prisma` singleton is imported from `src/config/db.config.ts`

### Testing

- Jest with ts-jest, supertest for integration/E2E
- Test files mirror source structure under `src/__tests__/`
- Mock Prisma via `src/__tests__/helpers/mock-db.ts`
- Integration tests use supertest against the Express app
- Run: `npm test`

### Observability

- **Logging**: Winston logger with JSON format. Import from `src/config/logger.config.ts`
- **Metrics**: Prometheus at `GET /metrics` (prom-client). Import from `src/config/metrics.config.ts`
- **Request logging**: Automatic via `requestLogger` middleware (includes correlation ID, duration)
- **Log levels**: Use `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()` — never `console.*`

### Audit Logging

- All mutations (POST/PUT/PATCH/DELETE) are automatically logged via `auditMiddleware`
- Sensitive fields (passwords, tokens) are redacted
- Audit logs retained for 7 years, auto-purged
- Audit data accessible via `GET /api/v1/audit` (requires `audit:read` permission)

## Common Tasks

### Adding a New Endpoint

1. Add route in `src/routes/<domain>.routes.ts`
2. Add controller method in `src/controllers/<domain>.controller.ts`
3. Add service method in `src/services/<domain>.service.ts`
4. Add DTO if new request body needed in `src/dto/<domain>.dto.ts`
5. Register middleware (auth, RBAC, validation)
6. Write tests in `src/__tests__/<domain>/`

### Creating a Migration

```bash
npx prisma migrate dev --schema=prisma/schema.prisma --name description
```

### Regenerating Prisma Client

```bash
npx prisma generate --schema=prisma/schema.prisma
```

Always run this after pulling changes that modify the schema.

## Useful URLs

| Resource | URL |
|----------|-----|
| Development server | `http://localhost:3010` |
| Health check | `http://localhost:3010/health` |
| API docs (Swagger) | `http://localhost:3010/api-docs` |
| Metrics | `http://localhost:3010/metrics` |
| Prisma Studio | `http://localhost:5555` (run `npx prisma studio`) |