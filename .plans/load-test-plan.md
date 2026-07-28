# Plan: Load Testing for EMS Backend — Phase 5, Task 505

## Date
2026-07-28

## Decision: k6 (pending AGPL legal review)

**Fallback:** Artillery (MPL 2.0) if AGPL blocked by procurement/legal.

## Council Verdict Summary

An LLM Council (Contrarian, First Principles, Expansionist, Outsider, Executor) analyzed Artillery vs k6 vs Locust. **No tool wins every dimension.** The council ranked k6 first based on: native CI thresholds, real control flow for multi-step visa scenarios, free horizontal scale, first-class Prometheus/Grafana export.

### Why Not the Others

| Tool | Weakness |
|---|---|
| Artillery | Free version single-process; thresholds need wrapper script; YAML breaks under conditional logic; distributed mode requires Pro license ($$$) |
| Locust | Python context-switch; no native CI thresholds; limited observability export; niche ecosystem |
| k6 (chosen) | Go binary (not npm); AGPL v3 core; goja JS VM ≠ Node (no TS, no npm modules) |

**Mitigations for k6:** Docker image in CI (zero-install), TS → JS in load tests only, shared JSON fixtures with Jest, AGPL review upfront.

## Subtasks

### 505.1 — AGPL / Legal Review (15 min)
- Confirm k6 AGPL v3 is acceptable for this project
- If blocked → switch to Artillery (MPL 2.0)
- **Blocker:** Do not proceed until clear

### 505.2 — CI Smoke Test (30 min)
- Set up `load-tests/smoke.js` targeting `/health` and `/api/v1/auth/login`
- Add `.github/workflows/load-smoke.yml` using `grafana/k6:latest` Docker image
- Threshold: `p(95) < 200ms`
- Validate: workflow runs, threshold fails the build on regression

### 505.3 — Shared Fixtures (1 hr)
- Move request payloads to `tests/fixtures/*.json`
- Consumed by both Jest (`require()`) and k6 (`open() + JSON.parse()`)
- No code sharing (k6 ≠ Node), only JSON sharing

### 505.4 — Visa Flow Scenario (4-6 hrs)
- Multi-step: setup (register + login) → submit visa → book appointment → payment
- Per-endpoint thresholds via `tags: { name: '...' }`
- `ramping-vus` stages: 5 → 50 (2m warmup) → 200 (5m sustained) → 500 (3m stress) → 0 (1m cooldown)
- 2-second think time between steps
- Token carryover via `setup()` function

### 505.5 — DB Pool Coordination (30 min)
- Match `DATABASE_POOL_SIZE` to max VUs: `target VUs ≤ pool_size * 0.8`
- Prevents "connection pool exhausted" false negatives

### 505.6 — Grafana Dashboard (1 hr)
- Prometheus pushgateway + Grafana via `docker-compose.observability.yml`
- k6 run: `--out prometheus=pushgateway:9091`
- Import k6 dashboard ID 2587

### 505.7 — CI Gate (30 min)
- Full integration: real PostgreSQL + Redis in CI services
- Server starts in background → k6 runs → thresholds fail or pass
- PR gate: load test must pass before merge

## Timebox

| Subtask | Time |
|---|---|
| 505.1 Legal check | 15 min |
| 505.2 Smoke test | 30 min |
| 505.3 Shared fixtures | 1 hr |
| 505.4 Visa flow scenario | 4-6 hrs |
| 505.5 DB pool tuning | 30 min |
| 505.6 Grafana dashboard | 1 hr |
| 505.7 CI pipeline | 30 min |
| **Total** | **~1.5 days** |

## Artillery Fallback (if AGPL blocked)

```bash
npm install -D artillery artillery-plugin-typescript
```
- Same fixtures, same CI structure
- Thresholds via `scripts/check-thresholds.mjs` (30-line custom script)
- Distributed = Pro license or self-hosted workers
- Lost vs k6: native thresholds, per-endpoint tags, Prometheus push, free horizontal scale