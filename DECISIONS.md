# Architecture Decision Records (ADR)

This document records the key technical decisions made during the development of the Promotions Management Module.

---

## ADR-001: Backend Framework — Node.js/Express over Laravel

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Technical test allows Node.js or Laravel for backend.

**Decision**: Node.js with Express and TypeScript.

**Rationale**:

- Unified TypeScript across frontend and backend — shared types, same language, same tooling
- Rich testing ecosystem (Vitest, Supertest) that integrates with Vite
- Faster development with shared type definitions between layers
- Lightweight for a REST API microservice pattern
- Team familiarity with Node.js

**Consequences**:

- Single language stack reduces context-switching
- Potential for shared validation schemas between frontend and backend (Zod)
- Must handle async error patterns explicitly (try/catch in async route handlers)

---

## ADR-002: Database — PostgreSQL with Prisma ORM

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Options include PostgreSQL, SQL Server, or MongoDB. Minimum 2 tables required.

**Decision**: PostgreSQL 16 with Prisma ORM.

**Rationale**:

- Relational model fits promotion/product-category relationships (junction table pattern)
- Prisma provides type-safe database access with excellent TypeScript integration
- Migrations managed declaratively via `schema.prisma`
- Strong community, excellent documentation
- Works well in Docker containers (Alpine images available)
- Raw SQL support for complex queries (summary aggregations)

**Consequences**:

- Prisma schema is the single source of truth for database structure
- Client auto-generated from schema — no manual SQL for most operations
- `$queryRaw` available for complex aggregations (health check, summary)
- Soft delete via `deletedAt` column (not database-level soft delete)

---

## ADR-003: Monorepo Structure — Separate Frontend/Backend Folders

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Project requires both React frontend and Node.js backend.

**Decision**: Separate `frontend/` and `backend/` directories with npm workspaces.

**Rationale**:

- Clear separation of concerns — each service has its own dependencies and build
- Independent build/deploy pipelines possible
- Shared TypeScript config patterns without actual type sharing (manual sync)
- Standard pattern for full-stack TypeScript projects
- Docker builds are independent per service

**Consequences**:

- Each service has its own `package.json`, `tsconfig.json`, and build scripts
- Root `package.json` provides workspace-level scripts (`npm run dev`, `npm test`)
- No shared code between frontend and backend (types duplicated manually)
- docker-compose orchestrates all services

---

## ADR-004: API Validation — Zod

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Need runtime validation matching TypeScript types for API inputs.

**Decision**: Zod for schema validation on both frontend and backend.

**Rationale**:

- TypeScript-first schema validation — infer types from schemas (single source of truth)
- Works on both frontend (form validation) and backend (request validation)
- Excellent error messages with field-level details
- `superRefine` for complex cross-field validations (discount bounds, date ordering)
- Integrates with `react-hook-form` via `@hookform/resolvers`

**Consequences**:

- Validation schemas defined in `backend/src/validators/` and `frontend/src/schemas/`
- Backend middleware (`validate.ts`) applies Zod schemas to request body/query/params
- Frontend forms use same schema via `zodResolver` from `@hookform/resolvers`
- Schema changes must be synchronized between frontend and backend manually

---

## ADR-005: State Machine — Promotion Lifecycle

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Promotions must follow status transitions: Programada → Activa → Finalizada.

**Decision**: Explicit state machine class with validated transitions.

**Rationale**:

- Business rule enforcement at the service layer (not just UI)
- Invalid transitions return 409 Conflict with descriptive error
- State validation is testable in isolation (unit tests per transition)
- Clear mapping of valid transitions: `Record<State, State[]>`
- Extended states: `Programada → Deleted` (soft delete), `Finalizada` (immutable terminal)

**State Diagram**:

```
Programada ──→ Activa ──→ Finalizada
     │                      (terminal)
     └──→ Deleted
          (terminal)
```

**Rules**:

- `Programada → Activa`: Requires current date within [startDate, endDate]
- `Activa → Finalizada`: No additional constraints
- `Programada → Deleted`: Soft delete (sets `deletedAt`)
- `Finalizada`: Immutable — no transitions, no updates, no deletes
- `Deleted`: Terminal — no transitions

**Consequences**:

- `PromotionStateMachine` class validates all transitions
- Controller layer catches `StateTransitionError` and returns 409
- UI disables buttons based on current state
- Tests verify every transition path and boundary condition

---

## ADR-006: Discount Value Storage — Decimal with Type Mapping

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Discount values need precise numeric storage for percentages (integer 1–100) and fixed amounts.

**Decision**: Store as `Decimal(10, 2)` in PostgreSQL, map to `number` in API responses.

**Rationale**:

- Prisma `Decimal` type preserves precision (no floating-point errors)
- `toFixed(2)` on input ensures consistent 2-decimal storage
- API returns plain `number` for JSON serialization
- Validation enforces bounds: percentage `1–100` (integer), fixed `> 0`

**Consequences**:

- Input conversion: `new Decimal(value.toFixed(2))` in service layer
- Output conversion: `Number(decimal.toFixed(2))` in response mapping
- Frontend displays value as-is (no additional formatting needed)
- Decimal precision prevents rounding errors in financial calculations

---

## ADR-007: Soft Delete Pattern

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Deleted promotions should be excluded from queries but preserved in database.

**Decision**: Column-level soft delete via `deletedAt` timestamp.

**Rationale**:

- Preserves audit trail — deleted records remain in database
- Reversible if needed (set `deletedAt = null`)
- Consistent pattern: `WHERE deletedAt IS NULL` on all queries
- Junction table records cascade-deleted with promotion (no orphan data)

**Consequences**:

- All list queries filter by `deletedAt: null`
- Only `Programada` promotions can be soft-deleted (state machine enforced)
- `DELETE` endpoint sets `deletedAt = new Date()` (HTTP 204 response)
- Prisma middleware does NOT auto-filter (explicit filter in each query for clarity)
- Summary aggregation excludes soft-deleted records

---

## ADR-008: Testing Strategy — Strict TDD + Vitest + Playwright

**Date**: 2025-08-27
**Status**: Accepted
**Context**: CI/CD requires lint → test → build → smoke test pipeline.

**Decision**: Strict TDD from project start. Vitest for unit/integration, Playwright for E2E.

**Rationale**:

- Vitest integrates natively with Vite (frontend build tool)
- Supertest for API integration testing (HTTP assertions)
- Playwright for reliable cross-browser E2E testing
- V8 provider for accurate code coverage
- Enforces quality from day one — every feature has tests first

**Test Pyramid**:

```
         ┌─────────────┐
         │   E2E (5)   │  Playwright — critical user flows
         ├─────────────┤
         │ Integration  │  Vitest + Supertest — API endpoints
         │   (many)     │
         ├─────────────┤
         │  Unit (many) │  Vitest — services, validators, utils
         └─────────────┘
```

**Consequences**:

- RED → GREEN → REFACTOR cycle for every task
- Coverage target: >80% on backend services and validators
- E2E tests run against docker-compose (full stack)
- CI uploads coverage artifacts for review

---

## ADR-009: Frontend State Management — React Query + Context API

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Frontend needs server state management for API data.

**Decision**: TanStack React Query for server state, Context API for global UI state.

**Rationale**:

- React Query handles caching, background refetch, optimistic updates
- Reduces boilerplate vs Redux (no action types, reducers, middleware)
- `useMutation` pattern for create/update/delete with automatic cache invalidation
- Context API sufficient for simple global state (theme, toast provider)

**Consequences**:

- API hooks in `frontend/src/api/` wrap React Query functions
- Mutations invalidate related queries automatically
- No global state store for server data — React Query IS the cache
- Error handling via `onError` callbacks in mutations (toast notifications)

---

## ADR-010: CI/CD — GitHub Actions with Dependent Stages

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Mandatory pipeline: lint → test → build → smoke test.

**Decision**: Single workflow file with `needs:` dependencies between jobs.

**Rationale**:

- Explicit dependency chain prevents wasted compute (test only if lint passes)
- Smoke test runs docker-compose and verifies `/health` (realistic integration check)
- Fails fast if any stage fails
- Secrets injected via GitHub Secrets (not in repo)

**Pipeline Stages**:

```
lint → test → build → smoke_test
```

- **Lint**: ESLint + Prettier + TypeScript type check (both frontend/backend)
- **Test**: Vitest with V8 coverage, upload artifacts
- **Build**: Docker Buildx, push to GHCR on main branch
- **Smoke Test**: docker-compose up, wait for `/health` 200 (60s timeout), verify frontend

**Consequences**:

- `.env.example` validated in smoke test (ensures no missing vars)
- Coverage reports uploaded as GitHub artifacts (7-day retention)
- Docker images tagged with git SHA and branch name
- Concurrency group cancels in-progress runs on same branch

---

## ADR-011: Docker Multi-Stage Builds

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Production containers should be minimal and secure.

**Decision**: Multi-stage builds for both frontend and backend.

**Backend**:

- Stage 1 (builder): `node:20-alpine`, install deps, `prisma generate`, TypeScript build
- Stage 2 (production): `node:20-alpine`, copy dist + node_modules, non-root user (`nodejs:1001`)

**Frontend**:

- Stage 1 (builder): `node:20-alpine`, install deps, `vite build`
- Stage 2 (production): `nginx:alpine`, copy dist to Nginx html dir, custom SPA config, non-root user

**Rationale**:

- Smaller production images (no devDependencies, no source code)
- Security: non-root user in production containers
- Nginx serves frontend with proper SPA routing (fallback to `index.html`)
- Health checks built into both Dockerfiles

**Consequences**:

- Build time ~2-3 min per service (npm ci + build)
- Production images ~100-150 MB each
- Nginx config handles SPA routing (`try_files $uri $uri/ /index.html`)
- Backend health check via `wget --spider` (available in Alpine)

---

## ADR-012: Health Endpoint Design

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Backend must expose `/health` returning 200 OK when app + DB operational.

**Decision**: `GET /health` checks database connectivity via Prisma `$queryRaw`.

**Rationale**:

- Simple implementation — verifies both app process and DB connection
- Returns JSON `{ status: "ok", timestamp, database: "connected" }`
- Returns 503 if DB unavailable (used by Docker healthcheck)
- 2-second timeout prevents hanging on DB issues

**Response**:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-08-27T12:00:00.000Z"
}
```

**Consequences**:

- Docker healthcheck uses `wget --spider -q http://localhost:3001/health`
- CI smoke test polls this endpoint with 60s timeout
- Frontend depends on backend health (docker-compose `depends_on: condition: service_healthy`)
- No authentication required (health check is public)

---

## ADR-013: Dual Association Pattern — Junction Table

**Date**: 2025-08-27
**Status**: Accepted
**Context**: A promotion can be associated with both products and categories.

**Decision**: Use a single junction table `PromotionProductCategory` with `associationType` discriminator.

**Rationale**:

- Single junction table for both product and category associations
- `associationType` column (`PRODUCT` | `CATEGORY`) distinguishes the association type
- Unique constraint on `[promotionId, productCategoryId]` prevents duplicates
- Cascade delete on promotion removes all associations

**Schema**:

```
Promotion ──┐
             ├──→ PromotionProductCategory ──→ ProductCategory
ProductCategory ──┘
```

**Consequences**:

- List endpoint returns `products[]` and `categories[]` arrays (filtered by `associationType`)
- Create/update accepts `product_ids[]` and `category_ids[]` arrays
- Validation requires at least one association (product or category)
- Query filtering by product or category uses `associations.some` in Prisma

---

## ADR-014: Pagination Pattern

**Date**: 2025-08-27
**Status**: Accepted
**Context**: Promotion list needs pagination with configurable page size.

**Decision**: Offset-based pagination with `page` and `size` query parameters.

**Rationale**:

- Simple offset pagination (skip/take in Prisma)
- Default: page 1, size 10
- Maximum size: 100 (clamped in utility)
- Response includes `total`, `page`, `size`, `total_pages`
- Ordering: `createdAt` descending (newest first)

**Response**:

```json
{
  "data": [...],
  "pagination": {
    "total": 42,
    "page": 1,
    "size": 10,
    "total_pages": 5
  }
}
```

**Consequences**:

- Query parameters validated via Zod schema
- Size clamped to `[1, 100]` range
- Total pages computed as `Math.ceil(total / size)`
- Frontend uses pagination for list navigation

---

## ADR-015: Promotion Overlap Prevention

**Date**: 2026-09-01
**Status**: Accepted
**Context**: Without validation, two simultaneous promotions on the same product or category can coexist in `PROGRAMADA`/`ACTIVA` states, creating ambiguous pricing rules at checkout and confusing reporting. Operators need an explicit, server-enforced guarantee that at most one non-finished promotion targets the same product/category at the same time.

**Decision**: Reject `create` and `update` on a promotion that overlaps in time **and** shares at least one product or category with an existing `PROGRAMADA` or `ACTIVA`, non-soft-deleted promotion. Return HTTP `409` with code `PROMOTION_OVERLAP` and a message that names the conflicting promotion and its date range.

**Rule** (strict half-open overlap):

```
overlap(a, b)  ⇔  a.start < b.end  AND  a.end > b.start
```

Adjacent ranges (`end == start`) are **not** considered overlapping.

**Existing promotion is considered a conflict iff**:

- `status ∈ {PROGRAMADA, ACTIVA}` (FINALIZADA is excluded)
- `deletedAt IS NULL`
- shares ≥ 1 product **or** ≥ 1 category with the candidate (junction table `promotion_products_categories`)

**Update semantics**: when updating, the overlap check uses the **resulting** range and associations (current values merged with the patch), and excludes the current promotion from the query so a promotion never conflicts with itself.

**Trade-off / cost**:

- Users must explicitly `finalize` or `softDelete` a conflicting promotion before creating a new one on the same scope. This is intentional — silent stacking of overlapping promotions is the bug we are preventing, not a feature.
- A compound index on `(status, deletedAt, startDate, endDate)` plus the existing junction index keeps the overlap query cheap.

**Consequences**:

- `ErrorCode.PROMOTION_OVERLAP` mapped to `409` in `backend/src/utils/errors.ts`
- `PromotionService.create()` and `update()` call a private `assertNoOverlap` before persisting
- Tested with 12 dedicated cases (full, partial, nested, adjacent, FINALIZADA allowed, soft-deleted allowed, self-update safe, etc.)
