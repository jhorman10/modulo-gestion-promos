## Exploration: modulo-gestion-promos - Initial Implementation

### Current State

This is a greenfield project for a Promotions Management Module (technical test for Kódigo Fuente). The SDD context has been initialized in openspec mode with key architectural decisions already documented:

- **Stack**: React+Vite+TS frontend, Node.js/Express+TS backend, PostgreSQL+Prisma ORM
- **Infrastructure**: Docker + docker-compose, GitHub Actions CI/CD
- **Testing**: Strict TDD enabled with Vitest + Supertest + Playwright
- **Validation**: Zod for schema validation
- **Project structure**: Monorepo with separate `frontend/` and `backend/` folders

No source code exists yet — only the requirements document (`prueba técnica.md`), SDD config, context, and decisions.

---

### Affected Areas

- `frontend/` — New React+Vite application (to be created)
- `backend/` — New Node.js/Express API with Prisma (to be created)
- `docker-compose.yml` — Service orchestration (to be created)
- `.github/workflows/ci.yml` — CI/CD pipeline (to be created)
- `prisma/schema.prisma` — Database schema (to be created)
- `.env.example` — Environment variables template (to be created)
- `DECISIONS.md` — Already exists, will be updated
- `README.md` — Documentation (to be created)

---

### Approaches

#### 1. Domain Model: Promocion Entity & States

| Approach                                                                        | Pros                                                          | Cons                                            | Complexity |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------- | ---------- |
| **Single `promotions` table with `status` enum (Programada/Activa/Finalizada)** | Simple, matches requirements directly, easy state transitions | Status logic in application layer               | Low        |
| **Separate tables per state**                                                   | Clean separation                                              | Over-engineered for this scope, complex queries | High       |
| **State machine pattern with explicit transition validation**                   | Prevents invalid transitions, auditable                       | More code upfront                               | Medium     |

**Selected**: Single table with `status` enum + application-layer state machine validation.

---

#### 2. Discount Types: Porcentaje vs Monto fijo

| Approach                                                   | Pros                        | Cons                                                   | Complexity |
| ---------------------------------------------------------- | --------------------------- | ------------------------------------------------------ | ---------- |
| **Single `discount_type` enum + `discount_value` numeric** | Simple, flexible            | Application must interpret based on type               | Low        |
| **Separate columns: `percentage_value`, `fixed_amount`**   | Type-safe at DB level       | Nullable columns, migration complexity if types change | Medium     |
| **Polymorphic/JSON column for discount config**            | Extensible for future types | Less queryable, no DB constraints                      | Medium     |

**Selected**: Single `discount_type` enum ('PERCENTAGE' | 'FIXED_AMOUNT') + `discount_value` decimal. Validation at API layer (Zod).

---

#### 3. Product/Category Association

| Approach                                                                          | Pros                                                 | Cons                                      | Complexity |
| --------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------- | ---------- |
| **Single `product_category` string field**                                        | Simplest, matches "producto o categoría" requirement | No referential integrity, no autocomplete | Low        |
| **Separate `products_categories` table with `type` enum (PRODUCT/CATEGORY) + FK** | Referential integrity, supports future filtering     | Requires seed data or admin UI            | Medium     |
| **Two separate tables: `products`, `categories` + polymorphic FK**                | Clean normalization                                  | Over-engineered for scope                 | High       |

**Selected**: Single `products_categories` table with `type` enum ('PRODUCT' | 'CATEGORY') + FK from `promotions`. Minimum viable referential integrity.

---

#### 4. API Endpoints Design

| Approach                                             | Pros                      | Cons                       | Complexity |
| ---------------------------------------------------- | ------------------------- | -------------------------- | ---------- |
| **RESTful CRUD + custom state transition endpoints** | Standard, clear semantics | More endpoints             | Low        |
| **Single PATCH /promotions/:id with `action` field** | Fewer endpoints           | Less RESTful, action-based | Low        |
| **GraphQL**                                          | Flexible queries          | Overkill, not required     | High       |

**Selected**: RESTful with explicit state transition endpoints:

- `POST /api/promotions` — Create
- `GET /api/promotions` — List (with filters)
- `GET /api/promotions/:id` — Get one
- `PATCH /api/promotions/:id` — Update (only Programada)
- `DELETE /api/promotions/:id` — Delete (only Programada)
- `POST /api/promotions/:id/activate` — Programada → Activa
- `POST /api/promotions/:id/finalize` — Activa → Finalizada
- `GET /api/promotions/summary` — Counters by status + valid today

---

#### 5. Database Schema (Minimum 2 Tables)

**Table 1: `promotions`**

```sql
id UUID PK
name VARCHAR(255) NOT NULL
product_category_id UUID FK → products_categories.id
discount_type ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL
discount_value DECIMAL(10,2) NOT NULL
start_date TIMESTAMP NOT NULL
end_date TIMESTAMP NOT NULL
status ENUM('PROGRAMADA', 'ACTIVA', 'FINALIZADA') DEFAULT 'PROGRAMADA'
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

**Table 2: `products_categories`**

```sql
id UUID PK
name VARCHAR(255) NOT NULL
type ENUM('PRODUCT', 'CATEGORY') NOT NULL
created_at TIMESTAMP DEFAULT NOW()
```

**Indexes**: `promotions(status)`, `promotions(start_date, end_date)`, `promotions(product_category_id)`

---

#### 6. Docker Compose Services

| Service    | Image                | Ports | Depends On | Healthcheck    |
| ---------- | -------------------- | ----- | ---------- | -------------- |
| `postgres` | `postgres:16-alpine` | 5432  | —          | `pg_isready`   |
| `backend`  | Local build          | 3001  | `postgres` | `curl /health` |
| `frontend` | Local build          | 5173  | `backend`  | `curl /`       |

**Networks**: Single `app-network` bridge
**Volumes**: `postgres_data` for persistence, `./backend:/app` (dev), `./frontend:/app` (dev)

---

#### 7. GitHub Actions Workflow Stages

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [checkout, setup-node, install, lint]

  test:
    needs: lint
    runs-on: ubuntu-latest
    steps: [checkout, setup-node, install, test, coverage]

  build:
    needs: test
    runs-on: ubuntu-latest
    steps: [checkout, setup-docker, build-images]

  smoke_test:
    needs: build
    runs-on: ubuntu-latest
    services:
      postgres: [image: postgres:16, healthcheck]
    steps:
      - checkout
      - setup-docker
      - docker compose up -d
      - wait-for-health /health
      - curl -f http://localhost:3001/health || exit 1
      - docker compose down
```

**Secrets**: `DATABASE_URL`, `NODE_ENV`, any API keys via GitHub Secrets
**Env validation**: Explicit `if: env.REQUIRED_VAR == ''` checks that fail the workflow

---

### Recommendation

Proceed with the following implementation approach:

1. **Database**: PostgreSQL + Prisma with the 2-table schema above
2. **API**: REST endpoints as specified with Zod validation
3. **State transitions**: Explicit endpoints (`/activate`, `/finalize`) with validation preventing invalid transitions and modification of `FINALIZADA`
4. **Frontend**: React Query for server state, minimal UI for CRUD + summary view
5. **Docker**: Multi-stage builds for production, dev volumes for hot reload
6. **CI/CD**: Dependent job chain with explicit env validation and smoke test

---

### Risks

1. **State transition race conditions** — Two concurrent requests could transition `Programada → Activa` twice. Mitigation: DB-level check constraint or optimistic locking with `updated_at` version.
2. **Date/time zone handling** — "Vigentes hoy" depends on server timezone. Mitigation: Store dates as UTC, compare using `CURRENT_DATE` in DB or explicit timezone in app.
3. **Percentage validation edge case** — Requirement says "entre 1 y 100". Clarify: inclusive? (Assume inclusive: 1-100)
4. **Delete cascade** — Deleting a product/category used by promotions. Mitigation: RESTRICT FK or soft-delete flag on products_categories.
5. **Docker healthcheck timing** — Backend may start before DB is ready. Mitigation: `depends_on` with `condition: service_healthy` + retry logic in backend startup.
6. **CI smoke test flakiness** — Containers may not be ready in time. Mitigation: Robust wait-for-health script with timeout.

---

### Ambiguities / Decisions Needed Before Proposal

| #   | Question                                                                                                                                                          | Impact                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | Should `discount_value` for percentage be stored as integer (1-100)? **Resolved: yes** — API accepts and stores integer 1-100 directly.                                                    | API contract, frontend input            |
| 2   | Is "producto o categoría" a free-text field or a managed list? Current decision: managed list via `products_categories` table. Confirm?                           | DB schema, UI (select vs input)         |
| 3   | Can a promotion be associated with BOTH a product AND a category? Requirement says "producto **o** categoría" (singular).                                         | Schema: single FK vs two nullable FKs   |
| 4   | Should the summary endpoint (`/summary`) be public or authenticated?                                                                                              | Auth design (currently none specified)  |
| 5   | What date format for API? ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`) or date-only (`YYYY-MM-DD`)?                                                                      | Zod schemas, frontend date pickers      |
| 6   | Soft delete for promotions or hard delete? Requirement says "eliminar" only for `Programada`.                                                                     | Implementation complexity               |
| 7   | Pagination for listing promotions? Not specified. Default to page/limit?                                                                                          | API design                              |
| 8   | Should `start_date` / `end_date` include time component or be date-only? "Fecha de inicio/fin" suggests date-only, but "vigente hoy" implies datetime comparison. | DB type (DATE vs TIMESTAMP), validation |

---

### Ready for Proposal

**Yes** — The exploration clarifies the domain model, API surface, database schema, infrastructure, and CI/CD pipeline. The main ambiguities (#1-8 above) should be resolved with the user before or during the proposal phase. The orchestrator should present these decisions to the user and then proceed to `sdd-propose` for the initial implementation change.
