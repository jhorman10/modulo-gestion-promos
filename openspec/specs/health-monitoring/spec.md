# Health Monitoring Specification

## Purpose

Provides a health check endpoint that verifies application and database connectivity. Used by Docker healthchecks and CI/CD smoke tests.

## Requirements

### Requirement: Health Check Endpoint

The system MUST expose GET /health endpoint.

The system SHALL return 200 OK with JSON body when application and database are healthy.

The system SHALL return 503 Service Unavailable when database is unreachable.

The system SHALL complete within 5 seconds (timeout for Docker healthcheck).

The system SHALL NOT require authentication.

#### Scenario: Happy path - all healthy

- GIVEN application running and PostgreSQL accepting connections
- WHEN GET /health is called
- THEN response status is 200
- AND response body: `{ "status": "ok", "database": "connected", "timestamp": "ISO 8601 datetime" }`

#### Scenario: Error - database unreachable

- GIVEN application running but PostgreSQL not accepting connections
- WHEN GET /health is called
- THEN response status is 503
- AND response body: `{ "status": "error", "database": "disconnected", "timestamp": "ISO 8601 datetime" }`

#### Scenario: Performance - response within timeout

- GIVEN healthy system
- WHEN GET /health is called
- THEN response completes within 2 seconds

---

## API Contracts

### GET /health

**Response 200**:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-09-15T10:30:00.000Z"
}
```

**Response 503**:
```json
{
  "status": "error",
  "database": "disconnected",
  "timestamp": "2026-09-15T10:30:00.000Z"
}
```

---

## Validation Rules

| Rule |
|------|
| No query parameters |
| No authentication |
| Must execute `SELECT 1` or Prisma `$queryRaw` to verify DB connectivity |
| Response must include ISO 8601 timestamp |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| SERVICE_UNAVAILABLE | 503 | Database connectivity check failed |

---

## Implementation Notes

- Use Prisma `$queryRaw`SELECT 1`` for lightweight DB check
- Catch PrismaClientKnownRequestError for connection failures
- Set appropriate timeout (2s) for the DB query
- Timestamp generated at response time (UTC)

---

## Test Scenarios (TDD Order)

1. **Unit - Health Service**: Mock Prisma, test healthy/unhealthy responses
2. **Integration - Endpoint**: Real DB connection, verify 200 response shape
3. **Integration - DB Down**: Stop Postgres, verify 503 response shape
4. **E2E - Docker Healthcheck**: `docker compose up`, verify backend healthcheck passes