# Tasks: modulo-gestion-promos Initial Implementation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2200–2800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Phase 0–1) → PR 2 (Phase 2–3) → PR 3 (Phase 4–5) → PR 4 (Phase 6–7) |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Monorepo scaffolding + backend health/registry + docker-compose + Prisma schema | PR 1 | Base branch; includes seed, health endpoint, product-category list |
| 2 | Backend promotion CRUD + state machine + validations + summary | PR 2 | Depends on PR 1; all promotion endpoints, integration tests |
| 3 | Frontend core + features (list, form, summary) + E2E | PR 3 | Depends on PR 2; React Query, components, Playwright flows |
| 4 | CI/CD pipeline + docs (README, DECISIONS, .env.example) | PR 4 | Depends on PR 3; GitHub Actions, smoke test, documentation |

---

## Phase 0: Project Scaffolding (Monorepo, Configs, Docker, Prisma)

- [x] 0.1 Create monorepo structure: `frontend/`, `backend/` directories with root `package.json` workspaces config
- [x] 0.2 Create `backend/package.json` with Express, TypeScript, Prisma, Zod, Vitest, Supertest, docker dependencies
- [x] 0.3 Create `frontend/package.json` with React, Vite, TypeScript, React Query, Playwright, Vitest, ESLint, Prettier
- [x] 0.4 Create `backend/tsconfig.json` (strict, ES2022, NodeNext modules) and `frontend/tsconfig.json` (strict, ES2022, bundler)
- [x] 0.5 Create `backend/.eslintrc.js`, `frontend/.eslintrc.js`, root `.prettierrc` with shared config
- [x] 0.6 Create `docker-compose.yml` with 3 services: postgres:16, backend:3001 (healthcheck → /health), frontend:5173; networks, volumes, depends_on with condition: service_healthy
- [x] 0.6b Create `backend/Dockerfile` (multi-stage: builder → node:20-alpine, prisma generate, non-root user)
- [x] 0.6c Create `frontend/Dockerfile` (multi-stage: builder → nginx:alpine, SPA config, healthcheck)
- [x] 0.7 Create `backend/prisma/schema.prisma` with models: Promotion, ProductCategory, PromotionProductCategory; enums: DiscountType, PromotionStatus, ProductCategoryType; indexes on status, date ranges, deletedAt
- [x] 0.8 Create `backend/prisma/seed.ts` with 5 products (PRODUCT) and 3 categories (CATEGORY), idempotent upsert
- [x] 0.9 Create root `.env.example` with DATABASE_URL, NODE_ENV, PORT, FRONTEND_URL placeholders
- [x] 0.10 Create `backend/vitest.config.ts` (test env node, coverage v8, setupFiles) and `frontend/vitest.config.ts` (jsdom, coverage)
- [x] 0.11 Create `frontend/playwright.config.ts` (baseURL http://localhost:5173, projects chromium/firefox/webkit)

**Test Commands**: `cd backend && npm test -- --run` (unit), `cd frontend && npm test -- --run` (unit)
**Spec Refs**: health-monitoring (scenario 4), product-category-registry (scenario 2), ci-cd-pipeline (build stage)
**Estimated Lines**: 350–450

---

## Phase 1: Backend Core (Health, DB, Product-Category CRUD)

- [x] 1.1 **RED** Write unit tests for HealthService: `getHealth()` returns ok/connected with timestamp (mock Prisma $queryRaw)
- [x] 1.2 **GREEN** Implement `backend/src/services/health.service.ts` with Prisma `$queryRaw\`SELECT 1\``, 2s timeout, error handling
- [x] 1.3 **RED** Write integration test for GET /health: real test DB, asserts 200 shape `{status, database, timestamp}`
- [x] 1.4 **GREEN** Implement `backend/src/controllers/health.controller.ts` + route `GET /health` in `backend/src/routes/health.routes.ts`
- [x] 1.5 **RED** Write unit tests for pagination helper: `calculatePagination(page, size, total)` clamps size to 100, computes total_pages
- [x] 1.6 **GREEN** Implement `backend/src/utils/pagination.ts` with Zod schema for query params
- [x] 1.7 **RED** Write unit tests for error formatter: `formatError(code, message, details?)` produces RFC 7807 structure
- [x] 1.8 **GREEN** Implement `backend/src/utils/errors.ts` with error codes from shared-contracts spec
- [x] 1.9 **RED** Write unit tests for date utils: ISO 8601 parse/format UTC, `isValidToday(start, end, serverDate)`
- [x] 1.10 **GREEN** Implement `backend/src/utils/dates.ts` with strict UTC handling
- [x] 1.11 **RED** Write integration tests for ProductCategoryService: list separated by type, pagination, type filter, empty state
- [x] 1.12 **GREEN** Implement `backend/src/services/product-category.service.ts` with Prisma queries
- [x] 1.13 **RED** Write integration test for GET /api/products-categories endpoint (Supertest, real DB, rollback)
- [x] 1.14 **GREEN** Implement controller + routes + Zod validators for product-category list endpoint
- [x] 1.15 **REFACTOR** Add Prisma middleware in `backend/src/prisma/client.ts` for soft delete filter (`deleted_at: null`)
- [x] 1.16 **REFACTOR** Create global error handler middleware `backend/src/middleware/error-handler.ts`
- [x] 1.17 **REFACTOR** Create request validation middleware using Zod schemas `backend/src/middleware/validate.ts`

**Test Commands**: `cd backend && npm test -- --run src/services/health.service.test.ts src/utils/`
**Spec Refs**: health-monitoring (scenarios 1–3), product-category-registry (scenarios 1–3), shared-contracts (all cross-cutting)
**Estimated Lines**: 400–500

---

## Phase 2: Backend Promotions (CRUD, State Machine, Validations, Summary)

- [x] 2.1 **RED** Write unit tests for PromotionValidator (Zod): 7+ scenarios — discount_value bounds (0.01–1.00), date ordering, required fields, enum values, at least one association, fixed amount > 0
- [x] 2.2 **GREEN** Implement `backend/src/validators/promotion.validator.ts` with Zod schemas (create, query, params)
- [x] 2.3 **RED** Write unit tests for PromotionStateMachine: valid/invalid transitions per state (Programada→Activa, Activa→Finalizada, Programada→Deleted, Finalizada immutable)
- [x] 2.4 **GREEN** Implement `backend/src/services/promotion-state-machine.ts` with transition validation logic
- [x] 2.5 **RED** Write unit tests for PromotionService.create: valid payload → 201 with status Programada, associations persisted, decimal storage for percentage
- [x] 2.6 **GREEN** Implement `backend/src/services/promotion.service.ts` create method (transaction: promotion + junction records)
- [x] 2.7 **RED** Write integration tests for POST /api/promotions (7 scenarios from spec)
- [x] 2.8 **GREEN** Implement controller + routes for create promotion
- [x] 2.9 **RED** Write integration tests for GET /api/promotions (4 pagination scenarios + soft delete exclusion)
- [x] 2.10 **GREEN** Implement list endpoint with Prisma pagination, soft delete filter, ordering by created_at desc
- [x] 2.11 **RED** Write unit tests for ActivateService: date range check (server date within [start,end]), state validation
- [x] 2.12 **GREEN** Implement activate logic in PromotionService.activate()
- [x] 2.13 **RED** Write integration tests for POST /api/promotions/{id}/activate (5 scenarios: success, 3 invalid state, date range)
- [x] 2.14 **GREEN** Implement activate controller + route
- [x] 2.15 **RED** Write unit tests for FinalizeService: only Activa→Finalizada allowed
- [x] 2.16 **GREEN** Implement finalize logic in PromotionService.finalize()
- [x] 2.17 **RED** Write integration tests for POST /api/promotions/{id}/finalize (3 scenarios)
- [x] 2.18 **GREEN** Implement finalize controller + route
- [x] 2.19 **RED** Write unit tests for SoftDeleteService: only Programada deletable, sets deleted_at
- [x] 2.20 **GREEN** Implement delete logic in PromotionService.softDelete()
- [x] 2.21 **RED** Write integration tests for DELETE /api/promotions/{id} (4 scenarios)
- [x] 2.22 **GREEN** Implement delete controller + route
- [x] 2.23 **RED** Write integration tests for Finalized Immutability (4 scenarios: update, activate, finalize, delete all 409)
- [x] 2.24 **RED** Write unit tests for SummaryService: by_status aggregation, valid_today with CURRENT_DATE, soft delete exclusion
- [x] 2.25 **GREEN** Implement `backend/src/services/summary.service.ts` with raw SQL or Prisma groupBy
- [x] 2.26 **RED** Write integration tests for GET /api/promotions/summary (3 scenarios: mixed, empty, no valid today)
- [x] 2.27 **GREEN** Implement summary controller + route
- [x] 2.28 **REFACTOR** Wire all promotion routes in `backend/src/routes/promotion.routes.ts`, register in main app
- [x] 2.29 **REFACTOR** Create `backend/src/main.ts` Express app factory: middleware, routes, error handler, graceful shutdown

**Test Commands**: `cd backend && npm test -- --run src/services/promotion. src/validators/ src/routes/promotion.`
**Spec Refs**: promotion-management (all 37 scenarios), promotion-summary (scenarios 1–3), shared-contracts (soft delete, pagination, errors)
**Estimated Lines**: 600–750

---

## Phase 3: Frontend Core (App Entry, Layout, Shared UI, Form System, Providers, Routing)

- [x] 3.1 **RED** Write test for App.tsx: renders with providers, navigates routes, redirects / to /promotions
- [x] 3.1 **GREEN** Implement `frontend/src/App.tsx` with React Router + React Query providers, routes
- [x] 3.2 **RED** Write test for main.tsx entry point: renders App in StrictMode with BrowserRouter
- [x] 3.2 **GREEN** Implement `frontend/src/main.tsx` entry point with createRoot
- [x] 3.3 **RED** Write test for Layout: renders header, navigation, main content area
- [x] 3.3 **GREEN** Implement `frontend/src/components/layout/Layout.tsx` with header, navigation, main content
- [x] 3.4 **RED** Write test for Header: renders title, links to /promotions, renders children
- [x] 3.4 **GREEN** Implement `frontend/src/components/layout/Header.tsx` with app title and navigation
- [x] 3.5 **RED** Write test for Navigation: default items, custom items, active state, correct links
- [x] 3.5 **GREEN** Implement `frontend/src/components/layout/Navigation.tsx` with routes to list, new, summary
- [x] 3.6 **RED** Write tests for Button: variants, loading state, disabled, aria-busy, click handler
- [x] 3.6 **GREEN** Implement `frontend/src/components/ui/Button.tsx` with variants: primary, secondary, danger, loading
- [x] 3.7 **RED** Write tests for Input: label, required indicator, error state, aria-invalid, forwardRef
- [x] 3.7 **GREEN** Implement `frontend/src/components/ui/Input.tsx` with error state, label, required indicator
- [x] 3.8 **RED** Write tests for Select: options, label, error state, placeholder, disabled
- [x] 3.8 **GREEN** Implement `frontend/src/components/ui/Select.tsx` with error state, label, options
- [x] 3.9 **RED** Write tests for DateTimePicker: datetime-local type, label, error, disabled
- [x] 3.9 **GREEN** Implement `frontend/src/components/ui/DateTimePicker.tsx` with datetime-local input
- [x] 3.10 **RED** Write tests for Modal: open/close, title, confirm/cancel buttons, close button, backdrop
- [x] 3.10 **GREEN** Implement `frontend/src/components/ui/Modal.tsx` confirmation dialogs with HTML dialog element
- [x] 3.11 **RED** Write tests for Toast: provider renders, toastService methods exist, custom position
- [x] 3.11 **GREEN** Implement `frontend/src/components/ui/Toast.tsx` notification system with react-hot-toast
- [x] 3.12 **RED** Write tests for Spinner: renders status role, size variants, custom label
- [x] 3.12 **GREEN** Implement `frontend/src/components/ui/Spinner.tsx` loading states
- [x] 3.13 **RED** Write tests for useFormValidation: initialization, setValue, form state, helpers
- [x] 3.13 **GREEN** Implement `frontend/src/hooks/useFormValidation.ts` with react-hook-form + Zod resolver
- [x] 3.14 **RED** Write tests for PromotionFormSchema: all validation rules, boundaries, defaults
- [x] 3.14 **GREEN** Implement `frontend/src/schemas/PromotionFormSchema.ts` mirroring backend Zod schema
- [x] 3.15 **RED** Write tests for FormField: label, required, error, hint, children rendering
- [x] 3.15 **GREEN** Implement `frontend/src/components/ui/FormField.tsx` reusable form field component
- [x] 3.16 **RED** Write tests for QueryProvider: renders children, uses client, custom client
- [x] 3.16 **GREEN** Implement `frontend/src/providers/QueryProvider.tsx` with QueryClientProvider, error retry, cache config
- [x] 3.17 **RED** Write tests for PromotionSummary: loading, data, error, zero values
- [x] 3.17 **GREEN** Implement `frontend/src/components/PromotionSummary.tsx` and routing in App.tsx

**Test Commands**: `cd frontend && npm test -- --run src/api/ src/components/ src/hooks/`
**Spec Refs**: promotion-management (UI flows), promotion-summary (UI), product-category-registry (dropdown data)
**Estimated Lines**: 400–500

---

## Phase 4: Frontend Features (Promotion List, Form, Summary View)

- [x] 4.1 **RED** Write integration test (Playwright) for Promotion List page: loads data, pagination works, shows status badges
- [x] 4.2 **GREEN** Implement `frontend/src/pages/PromotionsPage.tsx` composing List + Summary + Form (modal/drawer)
- [x] 4.3 **RED** Write Playwright test: Create promotion → appears in list → summary updates
- [x] 4.4 **GREEN** Wire create mutation in PromotionsPage, form submission flow, success toast
- [x] 4.5 **RED** Write Playwright test: Activate promotion (Programada→Activa) → list updates → summary valid_today increments
- [x] 4.6 **GREEN** Wire activate mutation, button enabled only for Programada within date range
- [x] 4.7 **RED** Write Playwright test: Finalize promotion (Activa→Finalizada) → list updates → summary by_status updates
- [x] 4.8 **GREEN** Wire finalize mutation, button enabled only for Activa
- [x] 4.9 **RED** Write Playwright test: Delete Programada promotion → removed from list → summary decrements
- [x] 4.10 **GREEN** Wire delete mutation with confirmation, button enabled only for Programada
- [x] 4.11 **RED** Write Playwright test: Finalized promotion immutable — activate/finalize/delete buttons disabled, no edit
- [x] 4.12 **GREEN** Enforce UI disable for Finalized state in PromotionActions
- [x] 4.13 **RED** Write Playwright test: Empty state handling — no promotions shows message, summary all zeros
- [x] 4.14 **GREEN** Implement empty states in PromotionList and PromotionSummary
- [x] 4.15 **RED** Write Playwright test: Date picker validation — end_date must be after start_date
- [x] 4.16 **GREEN** Add client-side date validation in PromotionForm (mirrors backend)
- [x] 4.17 **REFACTOR** Polish UI: responsive layout, loading skeletons, error toasts, accessibility (ARIA labels, keyboard nav)

**Test Commands**: `cd frontend && npx playwright test --project=chromium`
**Spec Refs**: promotion-management (E2E scenario), promotion-summary (E2E), shared-contracts (date format, pagination)
**Estimated Lines**: 300–400

---

## Phase 5: Integration & E2E (Docker Compose, Full Flow Tests)

- [x] 5.1 **RED** Write Playwright E2E test: Full flow — create → activate → summary shows active → finalize → summary shows finalized
- [x] 5.2 **GREEN** Run E2E against local docker-compose (backend + postgres + frontend)
- [x] 5.3 **RED** Write Playwright test: Soft delete exclusion — delete Programada → verify removed from list and summary
- [x] 5.4 **RED** Write Playwright test: Invalid transitions blocked in UI — activate Finalizada, finalize Programada, delete Activa
- [x] 5.5 **RED** Write Playwright test: Pagination — create 15 promotions, verify page 2 shows 5 items
- [x] 5.6 **RED** Write Playwright test: Percentage boundary values (0.01, 1.00) accepted, 0.005 rejected
- [x] 5.7 **GREEN** Fix any integration issues found (CORS, env vars, healthcheck timing)
- [x] 5.8 **REFACTOR** Add wait-for-health script `backend/scripts/wait-for-health.ts` (60s timeout, 2s interval, exponential backoff)
- [x] 5.9 **REFACTOR** Verify `docker compose up -d` starts all 3 services healthy, `docker compose down -v` cleans up
- [x] 5.10 **REFACTOR** Run full backend test suite with coverage: `cd backend && npm run test:coverage` (target >80%)

**Test Commands**: `docker compose up -d && cd frontend && npx playwright test && docker compose down -v`
**Spec Refs**: health-monitoring (E2E), promotion-management (E2E), promotion-summary (E2E), ci-cd-pipeline (smoke test)
**Estimated Lines**: 150–200

---

## Phase 6: CI/CD Pipeline (GitHub Actions Workflow) — ✅ COMPLETE (12/12)

- [x] 6.1 **RED** Write unit test for workflow YAML: validates structure, jobs, needs dependencies, env var checks
- [x] 6.2 **GREEN** Create `.github/workflows/ci.yml` with 4 jobs: lint → test → build → smoke_test
- [x] 6.3 **RED** Write test for lint job: runs ESLint + Prettier on frontend/backend, fails on errors
- [x] 6.4 **GREEN** Implement lint job steps: checkout, setup-node, npm ci, npm run lint (both dirs)
- [x] 6.5 **RED** Write test for test job: runs Vitest with coverage, enforces >80% on backend services/validators
- [x] 6.6 **GREEN** Implement test job: needs lint, runs backend/frontend tests, uploads coverage artifacts
- [x] 6.7 **RED** Write test for build job: builds both Docker images successfully
- [x] 6.8 **GREEN** Implement build job: needs test, docker build frontend/backend, push to GHCR (optional)
- [x] 6.9 **RED** Write test for smoke_test job: validates DATABASE_URL/NODE_ENV secrets exist before docker compose
- [x] 6.10 **GREEN** Implement smoke_test job: needs build, waits for /health 200 (60s, retries), verifies frontend port 5173, `docker compose down -v` in always()
- [x] 6.11 **REFACTOR** Add caching for node_modules and Prisma in all jobs
- [x] 6.12 **REFACTOR** Configure GitHub Secrets: DATABASE_URL (postgres://...), NODE_ENV=test

**Test Commands**: `act push --workflows .github/workflows/ci.yml` (local) or push to test branch
**Spec Refs**: ci-cd-pipeline (all 7 scenarios)
**Estimated Lines**: 200–250

---

## Phase 7: Documentation (README, DECISIONS.md, .env.example) — ✅ COMPLETE (5/5)

- [x] 7.1 Create `README.md` with: project overview, prerequisites, quick start (`docker compose up`), local dev (backend/frontend separate), test commands, CI/CD overview, API reference links
- [x] 7.2 Update `DECISIONS.md` with: stack choices rationale, state machine design, discount decimal storage, soft delete approach, Docker multi-stage, CI/CD structure, testing strategy
- [x] 7.3 Verify `.env.example` completeness: DATABASE_URL, NODE_ENV, PORT, FRONTEND_URL, JWT_SECRET (placeholder)
- [x] 7.4 Create `backend/.env.example` and `frontend/.env.example` if service-specific vars needed
- [x] 7.5 Add API documentation (OpenAPI/Swagger) — optional: generate from Zod schemas

**Test Commands**: Manual review — verify `docker compose up` works from clean clone using README
**Spec Refs**: All specs (deliverables requirement), ci-cd-pipeline (secrets management)
**Estimated Lines**: 150–200

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 0 | 11 | Project scaffolding, Docker, Prisma, configs |
| Phase 1 | 17 | Backend core: health, pagination, errors, dates, product-category |
| Phase 2 | 29 | Backend promotions: CRUD, state machine, validations, summary |
| Phase 3 | 17 | Frontend core: API client, hooks, shared components |
| Phase 4 | 17 | Frontend features: pages, mutations, E2E flows |
| Phase 5 | 10 | Integration & E2E: docker compose, full flows |
| Phase 6 | 12 | CI/CD pipeline: 4-stage GitHub Actions ✅ |
| Phase 7 | 5 | Documentation: README, DECISIONS, env examples ✅ |
| **Total** | **118** | **Full implementation** |

### Implementation Order

1. **Phase 0** → Foundation (monorepo, docker, DB schema) — everything depends on this
2. **Phase 1** → Backend core services (health, registry, shared utilities) — used by Phase 2
3. **Phase 2** → Backend promotions (core business logic) — API contract for frontend
4. **Phase 3** → Frontend core (API layer, hooks, UI primitives) — prepares feature work
5. **Phase 4** → Frontend features (pages, user flows) — consumes backend API
6. **Phase 5** → Integration/E2E (verifies full stack works together)
7. **Phase 6** → CI/CD (validates deployability)
8. **Phase 7** → Documentation (final deliverables)

### Review Workload Forecast

- Estimated changed lines: 2200–2800
- 400-line budget risk: High
- Chained PRs recommended: Yes
- Delivery strategy: auto-forecast
- Decision needed before apply: Yes
- Suggested work-unit PR split: PR 1 (Phase 0–1) → PR 2 (Phase 2–3) → PR 3 (Phase 4–5) → PR 4 (Phase 6–7)

### Next Step

**Ask user for chain strategy** (stacked-to-main vs feature-branch-chain vs size:exception) before proceeding to `sdd-apply`. Each suggested PR is a standalone deliverable with tests and docs.