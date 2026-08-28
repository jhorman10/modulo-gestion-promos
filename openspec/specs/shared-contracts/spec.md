# Shared Contracts Specification

## Purpose

Defines cross-cutting contracts used across all API endpoints: pagination, error response format, date handling, and soft delete behavior.

## Requirements

### Requirement: Pagination Contract

All list endpoints MUST support pagination via `page` and `size` query parameters.

The system SHALL use 1-based page numbering (default: 1).

The system SHALL default size to 10, maximum 100.

The system SHALL return pagination metadata in consistent format.

#### Scenario: Standard pagination request

- GIVEN GET /api/promotions?page=2&size=20
- WHEN request processed
- THEN pagination object in response:
  ```json
  {
    "total": 45,
    "page": 2,
    "size": 20,
    "total_pages": 3
  }
  ```

#### Scenario: Invalid page parameter

- GIVEN page=0 or page=-1
- THEN response 400 with VALIDATION_ERROR

#### Scenario: Size exceeds maximum

- GIVEN size=200
- THEN response 400 with VALIDATION_ERROR, message "size must not exceed 100"

---

### Requirement: Error Response Format

All error responses MUST follow consistent structure.

The system SHALL include error code, human-readable message, and optional details.

The system SHALL use RFC 7807-style structure.

#### Scenario: Validation error response

- GIVEN validation fails
- THEN response:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Request validation failed",
      "details": [
        {
          "field": "discount_value",
          "message": "Percentage discount_value must be between 1 and 100"
        }
      ]
    }
  }
  ```

#### Scenario: State transition error response

- GIVEN invalid state transition
- THEN response:
  ```json
  {
    "error": {
      "code": "INVALID_STATE_TRANSITION",
      "message": "Only Programada promotions can be activated"
    }
  }
  ```

#### Scenario: Not found error response

- GIVEN resource not found or soft deleted
- THEN response:
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "Promotion not found"
    }
  }
  ```

---

### Requirement: Date Format Contract

All datetime fields MUST use ISO 8601 format in UTC.

The system SHALL accept: `YYYY-MM-DDTHH:mm:ss.sssZ` or `YYYY-MM-DDTHH:mm:ssZ`

The system SHALL return: `YYYY-MM-DDTHH:mm:ss.sssZ` (milliseconds precision)

The system SHALL store in PostgreSQL as TIMESTAMP (no timezone, treated as UTC).

#### Scenario: Date input/output consistency

- GIVEN input "2026-09-15T10:30:00Z"
- WHEN stored and retrieved
- THEN output equals "2026-09-15T10:30:00.000Z"

#### Scenario: Date comparison for "valid today"

- GIVEN promotion start_date "2026-09-15T00:00:00Z", end_date "2026-09-15T23:59:59Z"
- WHEN server date is 2026-09-15
- THEN promotion counts as "valid today"

---

### Requirement: Soft Delete Contract

Soft-deleted entities MUST be excluded from all read operations by default.

The system SHALL set `deleted_at` timestamp on delete.

The system SHALL NOT provide hard delete via API.

The system SHALL filter `WHERE deleted_at IS NULL` on all queries.

#### Scenario: Soft deleted promotion excluded

- GIVEN promotion with deleted_at = "2026-09-10T10:00:00Z"
- WHEN GET /api/promotions called
- THEN promotion not in response data

#### Scenario: Soft deleted promotion excluded from summary

- GIVEN soft-deleted promotion was "Activa"
- WHEN GET /api/promotions/summary called
- THEN by_status.Activa does not include deleted promotion

---

## Error Code Registry

| Code                     | HTTP Status | Used By                    | Description                              |
| ------------------------ | ----------- | -------------------------- | ---------------------------------------- |
| VALIDATION_ERROR         | 400         | All endpoints              | Request validation failed                |
| NOT_FOUND                | 404         | All GET/PATCH/DELETE by ID | Resource not found or soft deleted       |
| INVALID_STATE_TRANSITION | 409         | Promotion state endpoints  | Transition not allowed per state machine |
| SERVICE_UNAVAILABLE      | 503         | Health endpoint            | Database connectivity failed             |
| INTERNAL_ERROR           | 500         | All endpoints              | Unexpected server error                  |

---

## Test Scenarios (Cross-cutting)

1. **Unit - Pagination Helper**: Calculates total_pages correctly, clamps size to max
2. **Unit - Error Formatter**: Produces consistent structure for all error types
3. **Unit - Date Utils**: ISO 8601 parsing/formatting, UTC handling
4. **Integration - Soft Delete Filter**: All list/summary endpoints exclude deleted
5. **Contract Tests**: Each endpoint validates pagination, errors, dates against this spec
