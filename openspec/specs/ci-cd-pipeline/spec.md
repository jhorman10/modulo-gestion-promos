# CI/CD Pipeline Specification

## Purpose

GitHub Actions pipeline with four dependent stages: lint → test → build → smoke_test. Enforces secrets management, fails explicitly on missing env vars, and validates deployability via Docker Compose smoke test.

## Requirements

### Requirement: Lint Stage

The system MUST run ESLint and Prettier on frontend and backend.

The system SHALL fail if any linting errors exist.

The system SHALL run on every push and pull request to main.

#### Scenario: Happy path - clean code passes

- GIVEN code with no lint errors
- WHEN lint job runs
- THEN job succeeds

#### Scenario: Error - lint errors fail job

- GIVEN code with ESLint errors
- WHEN lint job runs
- THEN job fails with error output

---

### Requirement: Test Stage

The system MUST run Vitest unit and integration tests with coverage.

The system SHALL require coverage >80% on backend services/validators.

The system SHALL run Playwright e2e tests.

The system SHALL depend on lint stage completion.

#### Scenario: Happy path - tests pass with coverage

- GIVEN all tests passing and coverage >80%
- WHEN test job runs
- THEN job succeeds

#### Scenario: Error - coverage below threshold

- GIVEN backend coverage 75%
- WHEN test job runs
- THEN job fails with coverage report

---

### Requirement: Build Stage

The system MUST build Docker images for frontend and backend.

The system SHALL use multi-stage Dockerfiles.

The system SHALL depend on test stage completion.

#### Scenario: Happy path - images build successfully

- GIVEN valid Dockerfiles
- WHEN build job runs
- THEN frontend and backend images created

---

### Requirement: Smoke Test Stage

The system MUST spin up full stack with `docker compose up -d`.

The system SHALL wait for backend `/health` to return 200 (max 60s with retries).

The system SHALL verify frontend serves at port 5173.

The system SHALL tear down with `docker compose down -v`.

The system SHALL depend on build stage completion.

The system SHALL fail explicitly if required env vars (DATABASE_URL, NODE_ENV) are missing.

#### Scenario: Happy path - full stack healthy

- GIVEN built images and required secrets
- WHEN smoke_test job runs
- THEN docker compose starts 3 services
- AND backend /health returns 200 within 60s
- AND frontend responds at port 5173
- AND compose torn down cleanly

#### Scenario: Error - missing required secrets

- GIVEN DATABASE_URL not set in GitHub Secrets
- WHEN smoke_test job runs
- THEN job fails immediately with clear error message
- AND does not attempt docker compose

#### Scenario: Error - health check timeout

- GIVEN backend starts but /health never returns 200
- WHEN smoke_test job runs
- THEN job fails after 60s timeout
- AND logs show health check attempts

---

## Pipeline Structure

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
    steps: [checkout, docker-build]

  smoke_test:
    needs: build
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      NODE_ENV: ${{ secrets.NODE_ENV }}
    steps: [checkout, docker-compose-up, wait-for-health, verify-frontend, docker-compose-down]
```

---

## Required GitHub Secrets

| Secret       | Description                                 |
| ------------ | ------------------------------------------- |
| DATABASE_URL | PostgreSQL connection string for smoke test |
| NODE_ENV     | Environment (e.g., "test")                  |

---

## Validation Rules

| Rule                                                         |
| ------------------------------------------------------------ |
| All jobs run on ubuntu-latest                                |
| Explicit `needs:` dependencies between stages                |
| Smoke test validates env vars before docker compose          |
| Health check wait: 60s max, 2s interval, exponential backoff |
| `docker compose down -v` in finally/always block             |
| Pipeline triggered on push/PR to main                        |

---

## Test Scenarios (TDD Order)

1. **Unit - Workflow YAML Syntax**: Validates workflow file parses correctly
2. **Integration - Lint Job**: Runs locally with act or similar
3. **Integration - Test Job**: Coverage threshold enforcement
4. **Integration - Build Job**: Docker images produce valid artifacts
5. **E2E - Full Pipeline**: Push to test branch, verify all 4 stages pass
6. **E2E - Missing Secrets**: Verify explicit failure without secrets
7. **E2E - Health Check Timeout**: Simulate unhealthy backend
