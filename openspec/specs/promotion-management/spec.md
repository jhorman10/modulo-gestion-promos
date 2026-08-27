# Promotion Management Specification

## Purpose

Manages the complete lifecycle of promotions: creation, listing, state transitions (Programada → Activa → Finalizada), and soft deletion. Enforces business rules around validity periods, discount values, and state-dependent operations.

## Requirements

### Requirement: Create Promotion

The system MUST allow creating a promotion with all required fields.

The system SHALL validate that discount_value is a decimal between 0.01 and 1.00 for percentage type.

The system SHALL validate that end_date is strictly after start_date (ISO 8601 datetime).

The system SHALL validate that all required fields are provided: name, discount_type, discount_value, start_date, end_date, and at least one product or category association.

The system SHALL set initial status to "Programada" and deleted_at to null.

#### Scenario: Happy path - create percentage promotion with product and category

- GIVEN a valid promotion payload with discount_type "percentage", discount_value 0.15, start_date "2026-09-01T00:00:00Z", end_date "2026-09-30T23:59:59Z", and associations to product "Coca Cola 500ml" and category "Beverages"
- WHEN POST /api/promotions is called
- THEN response status is 201
- AND response body contains promotion with id, status "Programada", and all provided fields
- AND promotion is persisted with discount_value stored as decimal 0.15

#### Scenario: Happy path - create fixed amount promotion

- GIVEN a valid promotion payload with discount_type "fixed", discount_value 500, start_date "2026-09-01T00:00:00Z", end_date "2026-09-30T23:59:59Z"
- WHEN POST /api/promotions is called
- THEN response status is 201
- AND discount_value is stored as provided (no decimal conversion for fixed amounts)

#### Scenario: Edge case - percentage value at boundaries

- GIVEN discount_value 0.01 (1%) or 1.00 (100%)
- WHEN POST /api/promotions is called
- THEN promotion is created successfully

#### Scenario: Error - percentage value out of range

- GIVEN discount_value 0.005 or 1.01 for percentage type
- WHEN POST /api/promotions is called
- THEN response status is 400
- AND error code is "VALIDATION_ERROR"
- AND error message indicates percentage must be between 0.01 and 1.00

#### Scenario: Error - end_date before or equal to start_date

- GIVEN end_date "2026-09-01T00:00:00Z" and start_date "2026-09-01T00:00:00Z" (equal)
- WHEN POST /api/promotions is called
- THEN response status is 400
- AND error code is "VALIDATION_ERROR"
- AND error message indicates end_date must be after start_date

#### Scenario: Error - missing required fields

- GIVEN payload missing name or discount_type
- WHEN POST /api/promotions is called
- THEN response status is 400
- AND error code is "VALIDATION_ERROR"

#### Scenario: Error - no product or category association

- GIVEN payload with empty products and categories arrays
- WHEN POST /api/promotions is called
- THEN response status is 400
- AND error code is "VALIDATION_ERROR"
- AND error message indicates at least one product or category is required

---

### Requirement: List Promotions with Pagination

The system MUST support paginated listing of non-deleted promotions.

The system SHALL accept page (default 1) and size (default 10, max 100) query parameters.

The system SHALL return promotions ordered by created_at descending.

The system SHALL include pagination metadata: total, page, size, total_pages.

#### Scenario: Happy path - first page default size

- GIVEN 15 promotions exist in database
- WHEN GET /api/promotions is called
- THEN response status is 200
- AND response body contains 10 promotions (default size)
- AND pagination.total equals 15
- AND pagination.page equals 1
- AND pagination.total_pages equals 2

#### Scenario: Happy path - custom page and size

- GIVEN 25 promotions exist
- WHEN GET /api/promotions?page=2&size=5 is called
- THEN response contains 5 promotions (items 6-10)
- AND pagination.page equals 2
- AND pagination.size equals 5
- AND pagination.total_pages equals 5

#### Scenario: Edge case - page beyond total pages

- GIVEN 5 promotions exist
- WHEN GET /api/promotions?page=10 is called
- THEN response status is 200
- AND data array is empty
- AND pagination metadata reflects actual totals

#### Scenario: Error - size exceeds maximum

- GIVEN GET /api/promotions?size=200 is called
- THEN response status is 400
- AND error code is "VALIDATION_ERROR"
- AND error message indicates max size is 100

---

### Requirement: Activate Promotion (Programada → Activa)

The system MUST allow transitioning a promotion from "Programada" to "Activa" via explicit endpoint.

The system SHALL reject activation if promotion is not in "Programada" state.

The system SHALL reject activation if current server date is not within [start_date, end_date] range.

The system SHALL update status to "Activa" and updated_at timestamp.

#### Scenario: Happy path - activate valid promotion

- GIVEN promotion in "Programada" state with start_date "2026-09-01T00:00:00Z", end_date "2026-09-30T23:59:59Z", and today is 2026-09-15
- WHEN POST /api/promotions/{id}/activate is called
- THEN response status is 200
- AND promotion status is "Activa"
- AND updated_at is updated

#### Scenario: Error - promotion not in Programada state

- GIVEN promotion in "Activa" state
- WHEN POST /api/promotions/{id}/activate is called
- THEN response status is 409
- AND error code is "INVALID_STATE_TRANSITION"
- AND error message indicates only "Programada" promotions can be activated

#### Scenario: Error - activation outside validity period

- GIVEN promotion in "Programada" with start_date "2026-10-01T00:00:00Z" (future), today is 2026-09-15
- WHEN POST /api/promotions/{id}/activate is called
- THEN response status is 409
- AND error code is "INVALID_STATE_TRANSITION"
- AND error message indicates promotion cannot be activated outside its validity period

#### Scenario: Error - activate already finalized promotion

- GIVEN promotion in "Finalizada" state
- WHEN POST /api/promotions/{id}/activate is called
- THEN response status is 409
- AND error code is "INVALID_STATE_TRANSITION"

---

### Requirement: Finalize Promotion (Activa → Finalizada)

The system MUST allow transitioning a promotion from "Activa" to "Finalizada" via explicit endpoint.

The system SHALL reject finalization if promotion is not in "Activa" state.

The system SHALL update status to "Finalizada" and updated_at timestamp.

#### Scenario: Happy path - finalize active promotion

- GIVEN promotion in "Activa" state
- WHEN POST /api/promotions/{id}/finalize is called
- THEN response status is 200
- AND promotion status is "Finalizada"
- AND updated_at is updated

#### Scenario: Error - finalize non-active promotion

- GIVEN promotion in "Programada" state
- WHEN POST /api/promotions/{id}/finalize is called
- THEN response status is 409
- AND error code is "INVALID_STATE_TRANSITION"
- AND error message indicates only "Activa" promotions can be finalized

#### Scenario: Error - finalize already finalized promotion

- GIVEN promotion in "Finalizada" state
- WHEN POST /api/promotions/{id}/finalize is called
- THEN response status is 409
- AND error code is "INVALID_STATE_TRANSITION"

---

### Requirement: Delete Promotion (Soft Delete)

The system MUST soft delete promotions by setting deleted_at timestamp.

The system SHALL only allow deletion of promotions in "Programada" state.

The system SHALL exclude soft-deleted promotions from list and summary endpoints.

The system SHALL NOT allow hard delete via API.

#### Scenario: Happy path - delete scheduled promotion

- GIVEN promotion in "Programada" state
- WHEN DELETE /api/promotions/{id} is called
- THEN response status is 204
- AND promotion deleted_at is set to current timestamp
- AND promotion excluded from GET /api/promotions and GET /api/promotions/summary

#### Scenario: Error - delete active promotion

- GIVEN promotion in "Activa" state
- WHEN DELETE /api/promotions/{id} is called
- THEN response status is 409
- AND error code is "INVALID_STATE_TRANSITION"
- AND error message indicates only "Programada" promotions can be deleted

#### Scenario: Error - delete finalized promotion

- GIVEN promotion in "Finalizada" state
- WHEN DELETE /api/promotions/{id} is called
- THEN response status is 409
- AND error code is "INVALID_STATE_TRANSITION"

#### Scenario: Error - delete already deleted promotion

- GIVEN promotion with deleted_at set
- WHEN DELETE /api/promotions/{id} is called
- THEN response status is 404 (or 409 with appropriate message)

---

### Requirement: Prevent Modification of Finalized Promotions

The system MUST reject any modification attempt on promotions with status "Finalizada".

The system SHALL return 409 for create/update/delete/activate/finalize on finalized promotions.

#### Scenario: Error - update finalized promotion

- GIVEN promotion in "Finalizada" state
- WHEN PATCH /api/promotions/{id} is called with any changes
- THEN response status is 409
- AND error code is "INVALID_STATE_TRANSITION"
- AND error message indicates finalized promotions cannot be modified

---

## State Machine

```
Programada ──(activate)──→ Activa ──(finalize)──→ Finalizada
    │                                            ▲
    │           (delete)                         │
    └────────────────────────────────────────────┘
```

**Transitions**:
- Programada → Activa: POST /activate (requires current date within [start_date, end_date])
- Activa → Finalizada: POST /finalize
- Programada → Deleted: DELETE (soft delete, sets deleted_at)
- Finalized promotions: IMMUTABLE — no transitions allowed

---

## API Contracts

### POST /api/promotions

**Request**:
```json
{
  "name": "string (1-200 chars)",
  "discount_type": "percentage | fixed",
  "discount_value": "number (0.01-1.00 for percentage, >0 for fixed)",
  "start_date": "ISO 8601 datetime",
  "end_date": "ISO 8601 datetime",
  "product_ids": "string[] (optional)",
  "category_ids": "string[] (optional)"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "name": "string",
  "discount_type": "percentage | fixed",
  "discount_value": "number",
  "start_date": "ISO 8601 datetime",
  "end_date": "ISO 8601 datetime",
  "status": "Programada",
  "products": [{"id": "uuid", "name": "string", "type": "PRODUCT"}],
  "categories": [{"id": "uuid", "name": "string", "type": "CATEGORY"}],
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime",
  "deleted_at": null
}
```

### GET /api/promotions

**Query**: `page` (int, default 1), `size` (int, default 10, max 100)

**Response 200**:
```json
{
  "data": [...promotion objects...],
  "pagination": {
    "total": "integer",
    "page": "integer",
    "size": "integer",
    "total_pages": "integer"
  }
}
```

### POST /api/promotions/{id}/activate

**Response 200**: Promotion object with status "Activa"

**Response 409**: `{ "error": { "code": "INVALID_STATE_TRANSITION", "message": "string" } }`

### POST /api/promotions/{id}/finalize

**Response 200**: Promotion object with status "Finalizada"

**Response 409**: `{ "error": { "code": "INVALID_STATE_TRANSITION", "message": "string" } }`

### DELETE /api/promotions/{id}

**Response 204**: No content

**Response 409**: `{ "error": { "code": "INVALID_STATE_TRANSITION", "message": "string" } }`

---

## Validation Rules Summary

| Field | Rule |
|-------|------|
| name | Required, 1-200 chars |
| discount_type | Required, enum: "percentage" \| "fixed" |
| discount_value | Required, number. Percentage: 0.01-1.00 (2 decimals max). Fixed: > 0 |
| start_date | Required, valid ISO 8601 datetime |
| end_date | Required, valid ISO 8601 datetime, > start_date |
| product_ids | Optional array of UUIDs, must exist in products_categories |
| category_ids | Optional array of UUIDs, must exist in products_categories |
| At least one association | Required: product_ids.length + category_ids.length > 0 |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request body/query validation failed |
| NOT_FOUND | 404 | Promotion not found (or soft deleted) |
| INVALID_STATE_TRANSITION | 409 | State transition not allowed per state machine |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## Database Schema

### promotions table

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| name | VARCHAR(200) | NOT NULL |
| discount_type | VARCHAR(20) | NOT NULL, CHECK IN ('percentage', 'fixed') |
| discount_value | DECIMAL(10,2) | NOT NULL |
| start_date | TIMESTAMP | NOT NULL |
| end_date | TIMESTAMP | NOT NULL |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'Programada', CHECK IN ('Programada', 'Activa', 'Finalizada') |
| deleted_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |

### promotion_product_category junction table

| Column | Type | Constraints |
|--------|------|-------------|
| promotion_id | UUID | FK → promotions.id, CASCADE DELETE |
| product_category_id | UUID | FK → products_categories.id, CASCADE DELETE |
| association_type | VARCHAR(20) | NOT NULL, CHECK IN ('PRODUCT', 'CATEGORY') |
| PRIMARY KEY | (promotion_id, product_category_id, association_type) | |

---

## Test Scenarios (TDD Order)

1. **Unit - Validators**: discount_value bounds, date ordering, required fields, enum values
2. **Unit - State Machine**: valid/invalid transitions for each state
3. **Integration - Create**: success, validation errors (7 scenarios)
4. **Integration - List**: pagination (4 scenarios), soft delete exclusion
5. **Integration - Activate**: success (1), invalid state (3), date range (1)
6. **Integration - Finalize**: success (1), invalid state (2)
7. **Integration - Delete**: success (1), invalid state (3)
8. **Integration - Finalized Immutability**: update, activate, finalize, delete all rejected
9. **E2E**: Create → Activate → Summary shows active → Finalize → Summary shows finalized