# Design: modulo-gestion-promos Initial Implementation

## Technical Approach

Monorepo: `frontend/` (React+Vite+TS), `backend/` (Express+TS+Prisma), `docker-compose.yml`. REST API with Zod validation at boundary. Explicit state machine endpoints (`/activate`, `/finalize`). React Query for server state. Multi-stage Docker. 4-stage GitHub Actions (lint→test→build→smoke_test). Strict TDD per specs in `openspec/specs/`.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Monorepo** | Single repo, `frontend/` `backend/` at root | Atomic commits, shared docker-compose, simple CI |
| **State Machine** | Explicit endpoints + service validation | Testable, observable, portable; no hidden DB triggers |
| **Validation** | Zod schemas → infer TS types | Runtime + compile-time, composable, matches spec contracts |
| **Server State** | TanStack Query v5 | Caching, deduping, invalidation built-in |
| **Soft Delete** | Prisma middleware `deleted_at: null` filter | Single enforcement point, impossible to forget |
| **Discount Storage** | Prisma `Decimal` (NUMERIC 10,2); API accepts 1–100 | Spec requires 0.01–1.00; avoids float precision |
| **Docker** | Multi-stage: builder → nginx (FE) / node:20-alpine (BE) | ~20MB FE, ~50MB BE, no dev deps in prod |

## Data Flow

```
Browser → Nginx:80 → Frontend (Vite) → API calls → Backend:3001 → Prisma → PostgreSQL:5432
                                                    ↑
                                          Health check (SELECT 1)
```

**Create Promotion**: POST /api/promotions (Zod) → Controller → Service (tx: promotion + junction) → Prisma (middleware filters `deleted_at`) → Response → React Query invalidation.

**State Transition**: POST /activate → Service validates `status=Programada` AND `CURRENT_DATE BETWEEN start/end` → UPDATE status → Returns updated → Frontend invalidates queries.

## File Changes (Key Files)

| Area | Files |
|------|-------|
| **Backend** | `src/main.ts`, `routes/*.ts`, `controllers/*.ts`, `services/*.ts`, `validators/*.ts`, `middleware/*.ts`, `utils/*.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, `Dockerfile` |
| **Frontend** | `src/main.tsx`, `App.tsx`, `api/client.ts`, `api/*.ts`, `components/*.tsx`, `hooks/*.ts`, `utils/*.ts`, `Dockerfile` |
| **Infra** | `docker-compose.yml`, `.env.example`, `.github/workflows/ci.yml`, `README.md`, `DECISIONS.md` |

## Interfaces / Contracts

**Promotion Create**: `{ name, discount_type: "percentage"|"fixed", discount_value: number, start_date, end_date, product_ids?, category_ids? }` → **Response 201**: Full promotion with `status: "Programada"`, associations.

**List**: `GET /api/promotions?page&size` → `{ data: Promotion[], pagination: {total,page,size,total_pages} }`

**State**: `POST /activate`, `POST /finalize` → 200 updated promotion or 409 `INVALID_STATE_TRANSITION`

**Delete**: `DELETE /:id` (only `Programada`) → 204, sets `deleted_at`

**Summary**: `GET /summary` → `{ by_status: {Programada,Activa,Finalizada}, valid_today }`

**Error**: `{ error: { code, message, details? } }` — codes: `VALIDATION_ERROR`(400), `NOT_FOUND`(404), `INVALID_STATE_TRANSITION`(409), `SERVICE_UNAVAILABLE`(503), `INTERNAL_ERROR`(500)

**Prisma Models**: `Promotion` (id, name, discountType, discountValue, startDate, endDate, status, deletedAt), `ProductCategory` (id, name, type), `PromotionProductCategory` (junction with associationType). Enums: `DiscountType`, `PromotionStatus`, `ProductCategoryType`. Indexes on status, date ranges, deletedAt.

## Testing Strategy

| Layer | Scope | Tool |
|-------|-------|------|
| **Unit** | Validators (7+ scenarios), Services (state machine, valid_today, soft delete), Utils (pagination, dates) | Vitest, mock Prisma |
| **Integration** | All 6 promotion endpoints, registry, health — real test DB, rollback per test | Vitest + Supertest |
| **E2E** | Create→Activate→Summary→Finalize→Summary, soft delete exclusion | Playwright vs docker-compose |

**Order**: Validators → State Machine → Create (7) → List (4) → Activate (5) → Finalize (3) → Delete (4) → Finalized Immutability (4) → Registry → Summary → Health → E2E.

**Coverage**: >80% on `services/`, `validators/`, `utils/`.

## Migration / Rollout

Greenfield — no migration. `docker compose up -d` starts postgres → backend (waits pg healthy, runs `prisma migrate deploy`) → frontend. Seed runs idempotent. Rollback: `docker compose down -v` + git revert.

## Open Questions

- [ ] React Router v6 vs v7?
- [ ] Exact seed data names?
- [ ] Toast library (react-hot-toast vs custom)?
- [ ] CI cache keys for node_modules/Prisma?