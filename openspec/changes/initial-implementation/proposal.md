# Proposal: modulo-gestion-promos Initial Implementation

## Intent

Build the Promotions Management Module (technical test for Kódigo Fuente) — a full-stack web application to register and manage POS product promotions with controlled validity periods and state transitions. Currently no code exists; this is a greenfield implementation from requirements in `prueba técnica.md`.

## Scope

### In Scope

- **Backend**: Node.js/Express/TypeScript API with Prisma ORM
- **Frontend**: React+Vite/TypeScript with React Query
- **Database**: PostgreSQL schema (promotions, products_categories tables)
- **Docker**: Multi-service docker-compose (postgres, backend:3001, frontend:5173)
- **CI/CD**: GitHub Actions pipeline (lint → test → build → smoke_test)
- **Testing**: Strict TDD with Vitest (unit/integration), Playwright (e2e)
- **Deliverables**: DECISIONS.md, README.md, .env.example, public GitHub repo

### Out of Scope

- Authentication/authorization (summary endpoint is public per decision)
- Admin UI for products/categories management (seed data only)
- Real-time updates / WebSockets
- Multi-tenancy or organization support
- Advanced reporting beyond summary counters

## Capabilities

### New Capabilities

- `promotion-management`: CRUD + state transitions (Programada → Activa → Finalizada), validations, soft delete
- `product-category-registry`: Managed list of products/categories with dual association support
- `promotion-summary`: Public endpoint with counters by status + valid-today count
- `health-monitoring`: GET /health checking app + DB connectivity
- `ci-cd-pipeline`: GitHub Actions with dependent stages, secrets management, smoke test

### Modified Capabilities

- None (greenfield project)

## Approach

**Architecture**: Monorepo with separate `frontend/` and `backend/` directories sharing a docker-compose. REST API with Zod validation. React Query for server state. State machine enforced at API layer for promotions (explicit `/activate`, `/finalize` endpoints).

**Database**: PostgreSQL + Prisma. Two core tables + junction for dual association:

- `promotions` (id, name, discount_type, discount_value[decimal], start_date[datetime], end_date[datetime], status, deleted_at, timestamps)
- `products_categories` (id, name, type[PRODUCT|CATEGORY], timestamps)
- `promotion_product_category` (promotion_id, product_category_id, association_type[PRODUCT|CATEGORY]) — enables dual link

**Discount value**: Stored as decimal (0.01–1.00) per decision. API accepts 1–100 for percentage, converts to decimal.

**Dates**: ISO 8601 datetime (TIMESTAMP in DB). "Valid today" compares server date against start/end date range.

**Soft delete**: `deleted_at` timestamp on promotions. Hard delete only for `Programada` state per requirements.

**Pagination**: `page` + `size` query params on list endpoint.

**Docker**: Multi-stage builds. Backend healthcheck hits `/health`. Frontend serves static build via nginx. Volumes for dev hot-reload.

**CI/CD**: Dependent jobs with explicit `needs:`. Smoke test spins docker-compose, waits for `/health` 200. Fails fast on missing env vars.

**Strict TDD**: Test-first for all capabilities. Unit tests for validators/services. Integration tests for API endpoints. E2E for critical flows (create→activate→summary).

## Affected Areas

| Area                           | Impact   | Description                                                  |
| ------------------------------ | -------- | ------------------------------------------------------------ |
| `backend/src`                  | New      | Express app, routes, services, Prisma schema, Zod validators |
| `frontend/src`                 | New      | React app, components, hooks, React Query setup              |
| `backend/prisma/schema.prisma` | New      | Database models, enums, relations                            |
| `docker-compose.yml`           | New      | 3 services, networks, volumes, healthchecks                  |
| `.github/workflows/ci.yml`     | New      | 4-stage pipeline with secrets validation                     |
| `.env.example`                 | New      | Required env vars without values                             |
| `DECISIONS.md`                 | Modified | Append implementation decisions                              |
| `README.md`                    | New      | Setup, run, test instructions                                |

## Risks

| Risk                                          | Likelihood | Mitigation                                                                |
| --------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| State transition race conditions              | Medium     | Optimistic locking via `updated_at` version check in transition endpoints |
| Date/timezone handling for "valid today"      | Medium     | Store UTC, compare using `CURRENT_DATE` in DB query                       |
| Docker healthcheck timing (backend before DB) | High       | `depends_on: condition: service_healthy` + retry logic in backend startup |
| CI smoke test flakiness                       | Medium     | Robust wait-for-health script with 60s timeout and retries                |
| Percentage decimal precision                  | Low        | Use `Decimal` in Prisma, validate 2 decimal places max                    |

## Rollback Plan

1. **Git**: Revert commit(s) to pre-implementation state
2. **Docker**: `docker compose down -v` removes containers, networks, volumes
3. **Database**: Drop schema via `prisma migrate reset --force` (dev only)
4. **CI/CD**: Disable workflow in GitHub Actions UI if pipeline blocks main

## Dependencies

- Node.js 20+ (for backend/frontend builds)
- PostgreSQL 16 (via Docker image)
- GitHub repository with Actions enabled
- GitHub Secrets configured: `DATABASE_URL`, `NODE_ENV`

## Success Criteria

- [ ] `docker compose up` starts all 3 services healthy
- [ ] `GET /health` returns 200 with `{ status: "ok", database: "connected" }`
- [ ] All API endpoints pass integration tests (create, list, activate, finalize, delete, summary)
- [ ] Frontend loads at localhost:5173, shows promotion list + summary
- [ ] CI pipeline passes all 4 stages on push to main
- [ ] Coverage >80% on backend services/validators
- [ ] DECISIONS.md, README.md, .env.example committed to repo
