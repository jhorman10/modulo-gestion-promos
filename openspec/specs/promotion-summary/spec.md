# Promotion Summary Specification

## Purpose

Provides a public read-only endpoint with aggregated promotion counters by status and a count of promotions valid today. No authentication required per decision.

## Requirements

### Requirement: Get Promotion Summary

The system MUST return counters for each promotion status.

The system MUST return count of promotions valid today (server date within [start_date, end_date] AND status = "Activa").

The system SHALL exclude soft-deleted promotions from all counts.

The system SHALL use server date (UTC) for "valid today" comparison.

#### Scenario: Happy path - summary with mixed statuses

- GIVEN promotions: 3 Programada, 5 Activa, 2 Finalizada, 1 soft-deleted; today is 2026-09-15; 3 Activa promotions have date range including today
- WHEN GET /api/promotions/summary is called
- THEN response status is 200
- AND response body: `{ "by_status": { "Programada": 3, "Activa": 5, "Finalizada": 2 }, "valid_today": 3 }`
- AND soft-deleted promotion excluded from all counts

#### Scenario: Edge case - no promotions

- GIVEN empty promotions table
- WHEN GET /api/promotions/summary is called
- THEN response: `{ "by_status": { "Programada": 0, "Activa": 0, "Finalizada": 0 }, "valid_today": 0 }`

#### Scenario: Edge case - no active promotions valid today

- GIVEN 2 Activa promotions but both have future start_date
- WHEN GET /api/promotions/summary is called
- THEN valid_today equals 0

---

## API Contracts

### GET /api/promotions/summary

**Response 200**:

```json
{
  "by_status": {
    "Programada": "integer",
    "Activa": "integer",
    "Finalizada": "integer"
  },
  "valid_today": "integer"
}
```

---

## Validation Rules

| Rule                                                                                |
| ----------------------------------------------------------------------------------- |
| No query parameters accepted                                                        |
| No authentication required                                                          |
| Excludes soft-deleted promotions                                                    |
| "valid_today" = Activa promotions WHERE server_date BETWEEN start_date AND end_date |

---

## Error Codes

| Code           | HTTP Status | Description             |
| -------------- | ----------- | ----------------------- |
| INTERNAL_ERROR | 500         | Unexpected server error |

---

## Database Query Logic

```sql
-- by_status
SELECT status, COUNT(*) FROM promotions
WHERE deleted_at IS NULL
GROUP BY status;

-- valid_today
SELECT COUNT(*) FROM promotions
WHERE deleted_at IS NULL
  AND status = 'Activa'
  AND CURRENT_DATE BETWEEN start_date::date AND end_date::date;
```

---

## Test Scenarios (TDD Order)

1. **Unit - Query Logic**: Valid today calculation with various date ranges
2. **Integration - Summary**: Mixed statuses, valid_today calculation, soft delete exclusion
3. **Integration - Edge Cases**: Empty, no active, no valid today
4. **E2E**: Create promotions → verify summary updates correctly through state transitions
