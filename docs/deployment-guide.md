# Deployment Guide

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | LTS recommended |
| npm | 10+ | Bundled with Node.js |
| PostgreSQL | 15+ | Database |
| Redis | 7+ | Optional — rate limiting falls back to in-memory |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required
DATABASE_URL="postgresql://user:password@host:5432/embassy_mgt_system?schema=public"
DATABASE_SSL="true"
JWT_ACCESS_SECRET="<generate-a-random-secret>"
JWT_REFRESH_SECRET="<generate-a-different-random-secret>"

# Optional with defaults
PORT=3010
CORS_ORIGIN="http://localhost:5173"
REDIS_URL="redis://localhost:6379"
# REDIS_PASSWORD=""
# AUDIT_LOG_RETENTION_DAYS=2555
# ENABLE_SWAGGER=true
# LOG_LEVEL=info
# LOG_DIR=logs
# METRICS_ENABLED=true
```

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# 3. Run database migrations
npx prisma migrate dev --schema=prisma/schema.prisma --name init

# 4. Start development server
npm run dev
```

## Docker

A `docker-compose.yml` is provided for infrastructure (PostgreSQL + Redis):

```bash
# Start database services
docker compose up -d

# Run the app locally (connects to Docker services)
npm run dev

# Or build and run the app inside Docker (requires a Dockerfile)
```

To add the Node.js app to Docker Compose, create a `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci && npx prisma generate --schema=prisma/schema.prisma
COPY . .
EXPOSE 3010
CMD ["node", "dist/index.js"]
```

## Production Build

```bash
# Compile TypeScript
npm run build

# Run Prisma migrations
npx prisma migrate deploy --schema=prisma/schema.prisma

# Start production server
npm start
```

## Available Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start production server |
| `npm test` | Run test suite (Jest) |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npx prisma studio` | Open Prisma Studio (DB GUI) |
| `npx prisma migrate dev` | Create/apply dev migrations |
| `npx prisma migrate deploy` | Apply pending migrations (production) |
| `npx prisma generate` | Regenerate Prisma client |

## Health & Monitoring

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Health check (status, uptime, timestamp) |
| `GET /metrics` | Prometheus metrics |
| `GET /api-docs` | Swagger UI documentation |

### Metrics

Prometheus metrics are available at `GET /metrics` (disabled in test mode). Custom metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total requests (labels: method, route, status_code) |
| `http_request_duration_seconds` | Histogram | Request duration (buckets: 10ms to 5s) |
| `http_requests_active` | Gauge | In-flight requests |
| `http_request_errors_total` | Counter | 5xx errors |

### Logging

Structured JSON logging via Winston:

- Console: colorized in development, JSON in production
- File rotation: `logs/error.log` (error level only, 5×5MB), `logs/combined.log` (all levels, 10×5MB)
- Correlation IDs: every request gets a UUID logged with all related entries
- Log level: configured via `LOG_LEVEL` env (debug, info, warn, error, silent)

## Security Notes

- JWT secrets **must** be changed from defaults in production
- Redis password **must** be set in production (use `rediss://` for TLS)
- PostgreSQL SSL is enforced unless `DATABASE_SSL=false` is set
- Rate limiting: 100 req/min general, 20 req/15min for auth endpoints
- Audit logs are retained for 2555 days (7 years, configurable)
- CORS origin should be restricted to the frontend domain

## Database Migrations

```bash
# Development: create and apply
npx prisma migrate dev --schema=prisma/schema.prisma --name description

# Production: apply pending
npx prisma migrate deploy --schema=prisma/schema.prisma

# Reset database (development only)
npx prisma migrate reset --schema=prisma/schema.prisma

# Push schema without migration (prototyping only)
npx prisma db push --schema=prisma/schema.prisma
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `P1012` error | Schema datasource has `url = env(...)` | Remove `url` from schema; use `prisma.config.ts` instead |
| `Cannot find module '../generated/prisma/client'` | Client not generated | Run `npx prisma generate --schema=prisma/schema.prisma` |
| `ECONNREFUSED` on DB | PostgreSQL not running | Start Docker containers or local PostgreSQL |
| JWT errors | Missing or wrong JWT secrets | Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `.env` |
| Rate limiting not working with Redis | Redis not running | Falls back to in-memory store automatically |