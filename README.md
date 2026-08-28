# Promotions Management Module

A full-stack web application for managing product promotions and discounts. Built as a technical test for Kodigo Fuente.

## Overview

This module allows users to register and manage promotions for POS products, controlling their lifecycle status (Programada → Activa → Finalizada) and validity periods.

### Features

- **Promotion CRUD** — Create, list, edit, and soft-delete promotions
- **State Machine** — Enforced lifecycle: Programada → Activa → Finalizada
- **Dual Associations** — Promotions linked to products and/or categories via junction table
- **Discount Types** — Percentage (0.01–1.00) and fixed amount discounts
- **Summary Dashboard** — Count by status + promotions valid today
- **Validation** — Zod schemas on both frontend and backend
- **Health Endpoint** — `GET /health` checks database connectivity

## Tech Stack

| Layer            | Technology                                   |
| ---------------- | -------------------------------------------- |
| Frontend         | React 18 + Vite + TypeScript                 |
| Backend          | Node.js + Express + TypeScript               |
| Database         | PostgreSQL 16 + Prisma ORM                   |
| Validation       | Zod                                          |
| State Management | TanStack React Query                         |
| Testing          | Vitest (unit/integration) + Playwright (E2E) |
| Containerization | Docker + docker-compose                      |
| CI/CD            | GitHub Actions (4-stage pipeline)            |
| Linting          | ESLint + Prettier                            |

## Prerequisites

- **Docker** & **Docker Compose** (v2+)
- **Node.js** 20+ (for local development)
- **npm** 10+ (for local development)

## Quick Start (Docker)

The fastest way to run the application:

```bash
# Clone the repository
git clone <repository-url>
cd modulo-gestion-promos

# Copy environment variables
cp .env.example .env

# Start all services (PostgreSQL + Backend + Frontend)
docker compose up -d

# Wait for services to be healthy (~30s), then open:
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001
# Health check: http://localhost:3001/health
```

### Service Ports

| Service    | Port | Description               |
| ---------- | ---- | ------------------------- |
| Frontend   | 5173 | React app served by Nginx |
| Backend    | 3001 | Express API server        |
| PostgreSQL | 5432 | Database                  |

## Local Development

For development with hot-reload:

```bash
# Install dependencies (root workspaces)
npm install

# Start backend in dev mode (with Prisma Studio in another terminal)
cd backend
cp ../.env.example .env
npx prisma generate
npx prisma db push
npm run dev

# Start frontend in dev mode
cd frontend
npm run dev
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial data (5 products + 3 categories)
npm run db:seed

# Open Prisma Studio (visual DB browser)
npm run db:studio
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

See [`.env.example`](./.env.example) for all available variables. Service-specific examples are in `backend/.env.example` and `frontend/.env.example`.

## Running Tests

### Unit & Integration Tests (Vitest)

```bash
# Run all tests
npm test

# Backend tests with coverage
cd backend && npm run test:coverage

# Frontend tests with coverage
cd frontend && npm run test:coverage

# Watch mode
cd backend && npm run test:watch
cd frontend && npm run test:watch
```

### End-to-End Tests (Playwright)

```bash
# Start the application first
docker compose up -d

# Run E2E tests (requires running app)
cd frontend && npx playwright test

# Run with UI mode
cd frontend && npx playwright test --ui

# Run specific browser
cd frontend && npx playwright test --project=chromium
```

### Linting & Formatting

```bash
# Lint all workspaces
npm run lint

# Format all files
npm run format

# Type check
cd backend && npm run typecheck
cd frontend && npm run typecheck
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs a 4-stage pipeline on push/PR to `main`:

```
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌─────────────┐
│  Lint   │ →  │   Test   │ →  │  Build  │ →  │ Smoke Test  │
│ (ESLint │    │ (Vitest  │    │ (Docker │    │ (docker     │
│ Prettier│    │ +V8      │    │ Buildx  │    │ compose up  │
│ tsc)    │    │ coverage)│    │ +GHCR)  │    │ +/health)   │
└─────────┘    └──────────┘    └─────────┘    └─────────────┘
```

- **Lint**: ESLint + Prettier checks on both frontend and backend
- **Test**: Vitest with V8 coverage, artifacts uploaded
- **Build**: Docker multi-stage builds, pushed to GitHub Container Registry
- **Smoke Test**: docker-compose up, wait for `/health` 200, verify frontend accessibility

## Project Structure

```
modulo-gestion-promos/
├── frontend/                    # React + Vite application
│   ├── src/
│   │   ├── api/                 # API client, hooks, mutations
│   │   ├── components/          # UI components (layout, ui, features)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Page components
│   │   ├── providers/           # Context providers (React Query)
│   │   ├── schemas/             # Zod validation schemas
│   │   └── utils/               # Utility functions
│   ├── e2e/                     # Playwright E2E tests
│   ├── Dockerfile               # Multi-stage build (Nginx)
│   └── package.json
├── backend/                     # Express + TypeScript API
│   ├── src/
│   │   ├── controllers/         # Route handlers
│   │   ├── middleware/           # Express middleware (validation, errors)
│   │   ├── prisma/              # Prisma client instance
│   │   ├── routes/              # Express route definitions
│   │   ├── services/            # Business logic layer
│   │   ├── utils/               # Utilities (errors, pagination, dates)
│   │   └── validators/          # Zod validation schemas
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   ├── seed.ts              # Seed data (products + categories)
│   │   └── migrations/          # Generated migrations
│   ├── Dockerfile               # Multi-stage build (Node.js)
│   └── package.json
├── .github/workflows/ci.yml     # GitHub Actions pipeline
├── docker-compose.yml           # 3-service setup
├── openspec/                    # SDD artifacts (specs, design, decisions)
├── .env.example                 # Environment variable template
├── DECISIONS.md                 # Architecture decision records
├── package.json                 # Root monorepo config
└── README.md                    # This file
```

## API Endpoints

| Method   | Endpoint                       | Description                             |
| -------- | ------------------------------ | --------------------------------------- |
| `GET`    | `/health`                      | Health check (DB connectivity)          |
| `GET`    | `/api/products-categories`     | List products and categories            |
| `POST`   | `/api/promotions`              | Create a promotion                      |
| `GET`    | `/api/promotions`              | List promotions (paginated, filterable) |
| `GET`    | `/api/promotions/summary`      | Get summary stats                       |
| `GET`    | `/api/promotions/:id`          | Get promotion by ID                     |
| `PATCH`  | `/api/promotions/:id`          | Update a promotion                      |
| `POST`   | `/api/promotions/:id/activate` | Activate (Programada → Activa)          |
| `POST`   | `/api/promotions/:id/finalize` | Finalize (Activa → Finalizada)          |
| `DELETE` | `/api/promotions/:id`          | Soft delete (Programada only)           |

See [API documentation](./API.md) for detailed endpoint specs, request/response schemas, and error codes.

## License

MIT
