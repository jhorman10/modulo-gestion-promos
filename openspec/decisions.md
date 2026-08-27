# Technical Decisions Log

## Decision: Backend Framework - Node.js/Express over Laravel
**Date**: 2025-08-27
**Status**: Decided
**Context**: Technical test allows Node.js or Laravel for backend.
**Decision**: Node.js with Express and TypeScript
**Rationale**:
- Unified TypeScript across frontend and backend
- Rich ecosystem for testing (Vitest, Supertest)
- Faster development with shared types
- Team familiarity with Node.js
- Lightweight for microservice-style API

## Decision: Database - PostgreSQL with Prisma ORM
**Date**: 2025-08-27
**Status**: Decided
**Context**: Options: PostgreSQL, SQL Server, MongoDB (minimum 2 tables)
**Decision**: PostgreSQL + Prisma ORM
**Rationale**:
- Relational model fits promotion/product-category relationships well
- Prisma provides type-safe database access with excellent TypeScript integration
- Migrations managed declaratively
- Strong community and documentation
- Works well in Docker containers

## Decision: Testing - Strict TDD with Vitest + Playwright
**Date**: 2025-08-27
**Status**: Decided
**Context**: CI/CD requires lint → test → build → smoke test pipeline
**Decision**: Enable Strict TDD from project start
**Rationale**:
- Vitest integrates natively with Vite (frontend build tool)
- Supertest for API integration testing
- Playwright for reliable E2E testing
- Coverage with v8 provider
- Enforces quality from day one

## Decision: Monorepo Structure (Separate Frontend/Backend Folders)
**Date**: 2025-08-27
**Status**: Decided
**Context**: Project requires both React frontend and Node.js backend
**Decision**: Separate `frontend/` and `backend/` directories with shared docker-compose
**Rationale**:
- Clear separation of concerns
- Independent build/deploy pipelines possible
- Shared types via workspace or manual sync
- Standard pattern for full-stack TypeScript projects

## Decision: API Validation with Zod
**Date**: 2025-08-27
**Status**: Decided
**Context**: Need runtime validation matching TypeScript types
**Decision**: Zod for schema validation
**Rationale**:
- TypeScript-first schema validation
- Infer types from schemas (single source of truth)
- Works on both frontend and backend
- Excellent error messages

## Decision: State Management - React Query + Context API
**Date**: 2025-08-27
**Status**: Decided
**Context**: Frontend needs server state management
**Decision**: React Query (TanStack Query) for server state, Context API for global UI state
**Rationale**:
- React Query handles caching, background refetch, mutations
- Reduces boilerplate vs Redux
- Context API sufficient for simple global state (theme, auth if needed)

## Decision: CI/CD - GitHub Actions with Dependent Stages
**Date**: 2025-08-27
**Status**: Decided
**Context**: Mandatory pipeline: lint → test → build → smoke test
**Decision**: Single workflow with `needs:` dependencies between jobs
**Rationale**:
- Explicit dependency chain prevents wasted compute
- Smoke test runs docker-compose and verifies /health
- Fails fast if any stage fails
- Secrets injected via GitHub Secrets

## Decision: Health Endpoint Implementation
**Date**: 2025-08-27
**Status**: Decided
**Context**: Backend must expose `/health` returning 200 OK when app + DB operational
**Decision**: GET /health checks database connectivity via Prisma `$queryRaw`
**Rationale**:
- Simple implementation
- Verifies both app process and DB connection
- Returns 200 OK with JSON `{ status: "ok", timestamp, database: "connected" }`
- Returns 503 if DB unavailable