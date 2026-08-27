# Product Category Registry Specification

## Purpose

Provides a managed reference list of products and categories that promotions can associate with. Supports dual association: a promotion links to BOTH products AND categories via a junction table with explicit association type.

## Requirements

### Requirement: List Products and Categories

The system MUST return all products and categories for promotion association dropdowns.

The system SHALL separate results by type: PRODUCT vs CATEGORY.

The system SHALL support pagination with page and size parameters.

The system SHALL order by name ascending.

#### Scenario: Happy path - list all for association UI

- GIVEN 5 products and 3 categories seeded in database
- WHEN GET /api/products-categories is called
- THEN response status is 200
- AND response contains products array (type PRODUCT) and categories array (type CATEGORY)
- AND each item has id, name, type

#### Scenario: Edge case - empty registry

- GIVEN no products or categories exist
- WHEN GET /api/products-categories is called
- THEN response status is 200
- AND products and categories arrays are empty

---

### Requirement: Seed Initial Data

The system MUST support seeding initial products and categories via Prisma seed script.

The system SHALL include at least 5 products and 3 categories in seed data.

#### Scenario: Happy path - seed runs successfully

- GIVEN fresh database
- WHEN `prisma db seed` is executed
- THEN products_categories table contains at least 8 rows
- AND types include both PRODUCT and CATEGORY

---

## API Contracts

### GET /api/products-categories

**Query**: `page` (int, default 1), `size` (int, default 50, max 100), `type` (optional: "PRODUCT" | "CATEGORY")

**Response 200**:
```json
{
  "products": [
    { "id": "uuid", "name": "string", "type": "PRODUCT" }
  ],
  "categories": [
    { "id": "uuid", "name": "string", "type": "CATEGORY" }
  ],
  "pagination": {
    "total": "integer",
    "page": "integer",
    "size": "integer",
    "total_pages": "integer"
  }
}
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| name | Required, 1-200 chars, unique per type |
| type | Required, enum: "PRODUCT" \| "CATEGORY" |

---

## Database Schema

### products_categories table

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| name | VARCHAR(200) | NOT NULL |
| type | VARCHAR(20) | NOT NULL, CHECK IN ('PRODUCT', 'CATEGORY') |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |
| UNIQUE | (name, type) | |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Query parameter validation failed |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## Test Scenarios (TDD Order)

1. **Unit - Seed Script**: Verifies seed creates expected data
2. **Integration - List**: Returns separated products/categories, pagination, type filter
3. **Integration - Empty State**: Handles empty registry gracefully