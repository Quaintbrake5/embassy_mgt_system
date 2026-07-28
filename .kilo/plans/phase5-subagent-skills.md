# Phase 5 Sub-Agent Skill Assignments

## Meta
- **Project**: Embassy Management System (EMS) Backend
- **Stack**: Node.js/TypeScript, Express 5, Prisma 7.9, PostgreSQL
- **Phase 5 Scope**: Weeks 12-13 — Testing, Security Hardening, Documentation
- **Status**: ⏳ Planned

## Overview

Each Phase 5 task is implemented by one or more sub-agents. This document specifies which skills each sub-agent should be instructed to use.

**Blanket constraint on ALL sub-agents**: `no-gold-plating` — Phase 5 is testing, hardening, and documentation. No new features, no refactors beyond what tests/audits require.

## Council Verdict: Nested Sub-Agent Depth for TASKS 501-503

**Question**: TASKS 501-503 require testing 71 source files (19 services, 17 controllers, 18 routes, 17 DTOs). Does this warrant nested sub-agents (agents that spawn child agents), and do nested agents need additional skills?

### Where the Council Agrees

- **Some parallelism is necessary**. A single agent cannot hold context for 71 files. Even with perfect reference patterns, the context window fills before coverage is meaningful.
- **2-level hierarchy is the maximum safe depth**. Three or more levels (coordinator → domain → file → sub-test) create unacceptable coordination overhead and context loss at each boundary.
- **Test infrastructure must be established first**. Before any parallel test writing begins, the coordinator must set up: shared mock factories, test DB seed data, and a test suite runner script. Parallel sub-agents writing tests against different infrastructure assumptions produce incompatible test files.
- **`subagent-orchestration` is the correct meta-skill for the coordinator**. It handles split-work boundaries, async coordination, fresh-context verifiers, and output consistency checks.

### Where the Council Clashes

| Position | Argument |
|----------|----------|
| **Flat (1 level)** | One agent writes all tests for TASK-501 (3 files). Five agents each write integration tests for their domain (TASK-502). Four agents each write E2E journeys (TASK-503). No agent spawns another agent. Predictable, no coordination loss, but slower — domain agents must hold ~14 files each. |
| **Nested (3 levels)** | Coordinator → domain agents → file-level agents. Maximizes parallelism (5 domain agents × 5 file agents = 25 simultaneous writers). Risky: coordination overhead doubles, duplicate setup code proliferates, parent loses visibility into leaf quality. |
| **Hybrid (2 levels)** | One coordinator sets up test infrastructure + dispatches 5 domain agents. Each domain agent writes ALL tests for its domain (unit + integration + E2E). No third level. Domain agents own their files fully. Fastest path: 6 total agents (1 coordinator + 5 domain), each with a focused, manageable scope. |

**Winner**: Hybrid (2 levels). The Coordination Overhead Theorem applies: every nesting level adds `O(n²)` communication cost (each leaf needs parent context, each sibling may conflict). 2 levels is the sweet spot where parallelism gains exceed coordination costs. 3 levels flips the equation.

### Blind Spots the Council Caught

- **Shared infrastructure: the hidden dependency**. All parallel test writers need consistent mocks, test DB state, and helper functions. If each domain agent creates its own `__tests__/helpers/` directory, the test suite becomes unmaintainable. The coordinator MUST produce a shared infrastructure spec before spawning workers.
- **Validation gap**: The council's own peer review caught that `comprehension-check` is missing from the original skill map. The coordinator needs it to verify the infrastructure spec is complete and sound before parallel work begins.
- **File conflict risk**: If domain agents write to `src/__tests__/` directly without coordination, they may overwrite each other's test setup files. Solution: each domain agent writes to `src/__tests__/<domain>/` subdirectory.

### The Recommendation

**Use 2-level hierarchy for TASKS 501-503. Do NOT nest deeper.**

```
Level 1 (Coordinator, 1 agent)
  └─ Skill: subagent-orchestration, comprehension-check
  └─ Job: Create test infrastructure (shared mocks, DB seed, jest setup)
  └─ Output: src/__tests__/helpers/ + src/__tests__/setup.ts

Level 2 (Domain agents, 5 agents, dispatched in parallel after Level 1 completes)
  ├─ test-domain-auth    → src/__tests__/auth/       (8-12 test files)
  ├─ test-domain-embassy → src/__tests__/embassy/     (6-8 test files)
  ├─ test-domain-visa    → src/__tests__/visa/        (8-10 test files)
  ├─ test-domain-emergency → src/__tests__/emergency/ (6-8 test files)
  └─ test-domain-financial → src/__tests__/financial/ (6-8 test files)

  Skills per domain agent: verification-before-completion, karpathy-guidelines,
                           pattern-matching, prisma-client-api, systematic-debugging
```

Each domain agent writes unit tests, integration tests, AND E2E tests for its domain. The agent owns its domain completely — no cross-domain coordination needed.

### The One Thing to Do First

**Run the coordinator agent to build shared test infrastructure.** Before any test file is written, the coordinator must produce:

1. `src/__tests__/helpers/factories.ts` — mock factories for Prisma models, JWT tokens, DTO inputs
2. `src/__tests__/setup.ts` — Jest setup file (global mocks for db.config, environment vars)
3. `src/__tests__/helpers/test-db.ts` — test database seed data factory (shared across all integration tests)
4. A README in `src/__tests__/` documenting the naming convention and shared helpers

Only after the coordinator completes and is verified via `comprehension-check` should the 5 domain agents be dispatched.

---

## TASK-501: Unit Tests

**Targets**: auth service, user service, RBAC middleware
**Existing patterns**: `src/__tests__/auth.service.test.ts` (Jest, manual mocks, `jest.mock()` for DB and utilities)

**Coordination pattern**: These are written by the domain agents (auth domain), NOT a separate agent. Each domain agent writes unit tests for all services in its domain as part of its assignment.

### Sub-agent: `test-domain-auth` (one of 5 domain agents)

| Skill | Why |
|-------|-----|
| `verification-before-completion` | Must run `npx jest` and confirm all tests pass before claiming done |
| `karpathy-guidelines` | Keep tests surgical — mock only Prisma and utilities, don't spin up real DB |
| `pattern-matching` | Mirror existing test structure: `describe`/`it` blocks, `mockPrisma` objects, `beforeEach` with `jest.clearAllMocks` |
| `prisma-client-api` | Correct mock shapes for Prisma queries (findUnique, create, update, etc.) |

**Avoid**: `test-driven-development` — code exists, TDD is for new code, not retroactive tests.

---

## TASK-502: Integration Tests

**Targets**: API endpoints for all Phase 1-4 modules, DB transactions, RBAC enforcement, audit logging
**Tooling**: supertest (already installed + typed)
**Prerequisite**: Coordinator must produce test infrastructure (shared DB seed, mock factories, test setup) BEFORE domain agents begin

### Sub-agents (5 domain agents, parallel)

Each domain agent writes integration tests for its domain's API endpoints. Tests use supertest against the Express app, seeded test DB, and the shared infrastructure from the coordinator.

| Domain Agent | Files Under Test | Estimated Test Files |
|---|---|---|
| `test-domain-auth` | auth, user, role, permission controllers + routes | 4-6 |
| `test-domain-embassy` | embassy, department, service-type, service-request, profile controllers + routes | 5-7 |
| `test-domain-visa` | visa-application, visa-document, visa-decision, vetting, appointment controllers + routes | 5-7 |
| `test-domain-emergency` | emergency controller + routes | 2-3 |
| `test-domain-financial` | legalization, diplomatic, financial controllers + routes | 3-5 |

| Skill | Why |
|-------|-----|
| `systematic-debugging` | Integration tests hit real DB through Prisma. When a test fails, structured triage is needed (isolate variable → reproduce → root cause), not guesswork |
| `prisma-client-api` | Correct semantics for Prisma filters, transactions, nested writes — prevents false failures from wrong query assumptions |
| `pattern-matching` | Mirror the existing `api.test.ts` structure (supertest request patterns, status code assertions, response body shape checks) |
| Coordinator skill: `subagent-orchestration` | Spawn 5 domain agents in parallel after infrastructure is verified |

---

## TASK-503: E2E Tests

**Targets**: Complete user journeys
- Citizen: register → profile → service request → appointment → payment → completion
- Visa: application → vetting → adjudication → decision
- Emergency: registration → alert → evacuation prioritization
- Diplomatic: pouch creation → handoff → receipt → closure

**Prerequisite**: Coordinator test infrastructure + integration test pass first (E2E depends on integration test setup)

### Sub-agents (5 domain agents, parallel — same agents as TASK-502)

Each domain agent writes E2E tests for its domain's user journey. No separate E2E sub-agents — the domain agent already owns the full test suite for its domain.

| Domain Agent | E2E Journey |
|---|---|
| `test-domain-auth` | registration → profile update → role assignment → login → token refresh → logout |
| `test-domain-embassy` | embassy CRUD → department CRUD → service type setup → service request lifecycle |
| `test-domain-visa` | visa application → document upload → vetting → adjudication → decision → appeal |
| `test-domain-emergency` | case registration → status update → alert broadcast → evacuation list |
| `test-domain-financial` | legalization request → process → complete → payment → reconciliation |

| Skill | Why |
|-------|-----|
| `requesting-code-review` | E2E tests have the highest false-positive risk (test passes but doesn't validate the right thing). Review required before declaring pass |
| `verification-before-completion` | Confirm each test file actually executes — E2E tests are complex and easy to break silently |
| Coordinator skill: `subagent-orchestration` | Journeys are independent; run in parallel for throughput. Use fresh-context verifier to check consistency across journeys |

---

## TASK-504: Security Audit & Hardening

**Targets**: npm audit, OWASP Top 10, rate limiting, CORS, TLS, JWT, encryption at rest

### Sub-agents (parallel by audit area)

- `auditor-deps` — npm audit, dependency review
- `auditor-owasp` — OWASP Top 10 checks (injection, XSS, broken auth, etc.)
- `auditor-config` — rate limiting validation, CORS whitelist, TLS config, encryption verification

| Skill | Why |
|-------|-----|
| `security-protocol` | Covers auth, JWT, encryption, CORS, TLS — all OWASP areas listed in the task |
| `insecure-defaults` | Catches fail-open config gaps: permissive CORS, missing rate limits, fallback secrets, debug endpoints enabled in production |
| Dispatching agent: `subagent-orchestration` | Audit areas are independent; findings merged into one report |

---

## TASK-505: Performance Testing

**Targets**: Load testing (1000 concurrent users), API response time (<200ms p95), connection pool (max 20), background jobs (<30s)

### Sub-agents (parallel)

- `perf-load-tester` — load generation, response time validation
- `perf-query-analyzer` — Prisma query profiling, N+1 detection, index recommendations

| Skill | Why |
|-------|-----|
| `performance-tuning` | Slow queries, high-latency routes, connection pool tuning |
| `prisma-client-api` | N+1 detection, `select`/`include` optimization, batch operations, raw query fallback patterns |
| Dispatching agent: `subagent-orchestration` | Load generation and query profiling are independent workstreams |

---

## TASK-506: Compliance Audit

**Targets**: GDPR compliance, Vienna Convention, audit log retention (7 years), data residency

### Sub-agent: `compliance-auditor` (single, tightly coupled)

| Skill | Why |
|-------|-----|
| `insecure-defaults` | GDPR failures often come from default-permissive configs: open data access, no retention limits, missing encryption at rest |
| `security-protocol` | Data handling verification, access controls, encryption verification |

No orchestration needed — this is one tightly-coupled report.

---

## TASK-507: Observability

**Targets**: Structured JSON logging (exists), OpenTelemetry tracing, metrics collection, alerting rules

### Sub-agent: `observability-engineer` (single, tightly coupled)

| Skill | Why |
|-------|-----|
| `karpathy-guidelines` | Start simple: structured logging already works. Don't deploy OpenTelemetry collectors and Grafana before basic logging is solid |
| `environment-awareness` | Node/OS-specific logging behavior (Windows vs Linux, process signals for graceful shutdown) |

No orchestration needed — observability configs are tightly coupled.

---

## TASK-508: Documentation

**Targets**: OpenAPI/Swagger spec, deployment guide, DB schema documentation, developer onboarding guide

### Sub-agents (parallel by document)

- `doc-writer-openapi` — OpenAPI/Swagger spec generation from route definitions
- `doc-writer-deploy` — Deployment guide (prerequisites, env vars, migration commands, Docker)
- `doc-writer-onboard` — Developer onboarding guide (repo setup, architecture overview, coding conventions)

| Skill | Why |
|-------|-----|
| `comprehension-check` | Produces plain-language walkthrough of codebase; output adapts directly into onboarding docs |
| `writing-guidelines` | Ensures consistent voice, clear structure, no jargon overload |
| Dispatching agent: `subagent-orchestration` | Documents are independent; write in parallel, then one consistent-format pass |

---

## Skill Reference Quick-Select

Sub-agents pick from this expanded list. Parent agent passes the relevant subset.

| Phase 5 Task | Level | Agent | Primary Skill | Secondary Skill |
|---|---|---|---|---|---|
| Infrastructure | 1 (coordinator) | `test-coordinator` | `subagent-orchestration` | `comprehension-check` |
| TASK-501 Unit | 2 (domain) | `test-domain-*` (5×) | `verification-before-completion` | `pattern-matching` |
| TASK-502 Integration | 2 (domain) | `test-domain-*` (5×) | `systematic-debugging` | `prisma-client-api` |
| TASK-503 E2E | 2 (domain) | `test-domain-*` (5×) | `requesting-code-review` | `verification-before-completion` |
| TASK-504 Security | 1 | `auditor-deps`/`auditor-owasp`/`auditor-config` (3× parallel) | `security-protocol` | `insecure-defaults` |
| TASK-505 Performance | 1 | `perf-load-tester` + `perf-query-analyzer` (2× parallel) | `performance-tuning` | `prisma-client-api` |
| TASK-506 Compliance | 1 | `compliance-auditor` (1×) | `insecure-defaults` | `security-protocol` |
| TASK-507 Observability | 1 | `observability-engineer` (1×) | `karpathy-guidelines` | `environment-awareness` |
| TASK-508 Documentation | 1 | `doc-writer-openapi`/`deploy`/`onboard` (3× parallel) | `comprehension-check` | `writing-guidelines` |

## Anti-Skills (Do Not Use)

| Task | Reason |
|------|--------|
| `test-driven-development` on any test task | Code already exists; TDD is for writing *new* code from tests |
| `frontend-design` on any backend task | Irrelevant for backend API testing and documentation |
| `ui-ux-pro-max` on any backend task | Irrelevant for backend work |
| `scope-guard` on security/compliance | These tasks need thoroughness, not minimal changes |
| `codebase-research` on documentation | Docs should *explain* the codebase, not research it |