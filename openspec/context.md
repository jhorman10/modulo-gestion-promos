# Project Context: modulo-gestion-promos

## Overview

Promotions Management Module - Technical Test for Kódigo Fuente. A web application to register and manage promotions/discounts for POS products, controlling their status and validity periods.

## Source Requirements

From `prueba técnica.md`:

### Functional Requirements

- **Promotion Management**: Create, list, change status (Programada → Activa → Finalizada), delete (only Programada)
- **Promotion Fields**: Name, product/category, discount type (Porcentaje/Monto fijo), discount value, start date, end date
- **Validations**: Required fields, end date > start date, percentage 1-100, no modification of Finalizada
- **Summary View**: Counter by status, count of promotions valid today

### Technical Constraints (Mandatory)

- **Frontend**: React + Vite (mandatory)
- **Backend**: Node.js or Laravel (choice: Node.js/Express)
- **Database**: PostgreSQL, SQL Server, or MongoDB — minimum 2 tables (choice: PostgreSQL)
- **Deployment**: Must run with `docker-compose up`
- **Health Endpoint**: `/health` returning 200 OK when app + DB operational

### CI/CD (Mandatory)

- GitHub Actions pipeline: `lint` → `test` → `build` → `smoke test`
- Smoke test: `docker compose up`, wait for containers, verify `/health` returns 200
- Secrets management: No secrets in repo, `.env.example` required, GitHub Secrets for sensitive values
- Pipeline fails explicitly if required env vars missing

### Deliverables

- Public GitHub repository
- `DECISIONS.md` explaining tech choices
- `README.md` with local setup instructions
- `.env.example` with required variables (no real values)
- Functional GitHub Actions workflow visible in Actions tab

## Stack Decisions

| Layer            | Choice                                       | Rationale                                          |
| ---------------- | -------------------------------------------- | -------------------------------------------------- |
| Frontend         | React + Vite + TypeScript                    | Mandatory, modern, fast HMR                        |
| Backend          | Node.js + Express + TypeScript               | Unified language, rich ecosystem                   |
| Database         | PostgreSQL + Prisma ORM                      | Relational, robust, Prisma for type-safe DB access |
| Containerization | Docker + docker-compose                      | Mandatory requirement                              |
| CI/CD            | GitHub Actions                               | Mandatory requirement                              |
| Testing          | Vitest (unit/integration) + Playwright (e2e) | Fast, native Vite integration                      |
| Linting          | ESLint + Prettier                            | Industry standard                                  |
| API Validation   | Zod                                          | Type-safe schema validation                        |

## Project Structure (Planned)

```
modulo-gestion-promos/
├── frontend/                 # React + Vite app
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── vite.config.ts
├── backend/                  # Node.js + Express API
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   ├── Dockerfile
│   └── tsconfig.json
├── docker-compose.yml
├── .env.example
├── .github/workflows/ci.yml
├── DECISIONS.md
├── README.md
└── openspec/                 # SDD artifacts
```

## Database Schema (Minimum 2 Tables)

1. **promotions** - Core promotion data
   - id, name, product_category, discount_type, discount_value, start_date, end_date, status, created_at, updated_at
2. **products_categories** - Product/category reference data
   - id, name, type (product/category), created_at

## Testing Strategy

- **Strict TDD**: Enabled (test runner detected in environment)
- **Unit**: Vitest for components, hooks, utilities, services
- **Integration**: Vitest + Supertest for API endpoints
- **E2E**: Playwright for critical user flows
- **Coverage**: v8 provider, target >80%

## Current State

- Project directory exists with requirements document
- No source code, no package.json, no docker-compose.yml
- Skill registry exists at `.atl/skill-registry.md`
- SDD initialized in openspec mode

## Next Steps (SDD Workflow)

1. `/sdd-explore` - Clarify requirements, explore design space
2. `/sdd-propose` - Create change proposal for initial implementation
3. `/sdd-spec` - Write delta specs with requirements and scenarios
4. `/sdd-design` - Create technical design and architecture
5. `/sdd-tasks` - Break into implementation tasks
6. `/sdd-apply` - Implement tasks
7. `/sdd-verify` - Execute tests and verify
8. `/sdd-archive` - Archive completed change
