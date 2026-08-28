# API Documentation

Base URL: `http://localhost:3001`

All endpoints return JSON. Dates use ISO 8601 format (UTC, ending with `Z`). IDs are UUIDs.

---

## Health Check

### `GET /health`

Check application and database connectivity.

**Response** `200 OK`

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-08-27T12:00:00.000Z"
}
```

**Response** `503 Service Unavailable` (database unreachable)

```json
{
  "status": "error",
  "database": "disconnected",
  "timestamp": "2025-08-27T12:00:00.000Z"
}
```

---

## Products & Categories

### `GET /api/products-categories`

List all products and categories.

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Product Name",
      "type": "PRODUCT",
      "created_at": "2025-08-27T12:00:00.000Z",
      "updated_at": "2025-08-27T12:00:00.000Z"
    }
  ]
}
```

---

## Promotions

### `POST /api/promotions`

Create a new promotion.

**Request Body**

```json
{
  "name": "Summer Sale",
  "discount_type": "percentage",
  "discount_value": 25,
  "start_date": "2025-06-01T00:00:00Z",
  "end_date": "2025-08-31T23:59:59Z",
  "product_ids": ["uuid-1", "uuid-2"],
  "category_ids": ["uuid-3"]
}
```

**Validation Rules**

| Field            | Type                        | Rules                                           |
| ---------------- | --------------------------- | ----------------------------------------------- |
| `name`           | string                      | Required, 1–200 characters                      |
| `discount_type`  | `"percentage"` \| `"fixed"` | Required                                        |
| `discount_value` | number                      | Required. Percentage: integer 1–100. Fixed: > 0 |
| `start_date`     | ISO 8601                    | Required, must end with `Z` (UTC)               |
| `end_date`       | ISO 8601                    | Required, must be after `start_date`            |
| `product_ids`    | UUID[]                      | At least one product or category required       |
| `category_ids`   | UUID[]                      | At least one product or category required       |

**Response** `201 Created`

```json
{
  "id": "uuid",
  "name": "Summer Sale",
  "discount_type": "percentage",
  "discount_value": 25,
  "start_date": "2025-06-01T00:00:00.000Z",
  "end_date": "2025-08-31T23:59:59.000Z",
  "status": "Programada",
  "products": [{ "id": "uuid-1", "name": "Product 1", "type": "PRODUCT" }],
  "categories": [{ "id": "uuid-3", "name": "Category 1", "type": "CATEGORY" }],
  "created_at": "2025-08-27T12:00:00.000Z",
  "updated_at": "2025-08-27T12:00:00.000Z",
  "deleted_at": null
}
```

---

### `GET /api/promotions`

List promotions with pagination and optional filters.

**Query Parameters**

| Parameter         | Type                                           | Description                               |
| ----------------- | ---------------------------------------------- | ----------------------------------------- |
| `page`            | number                                         | Page number (default: 1)                  |
| `size`            | number                                         | Page size (default: 10, max: 100)         |
| `status`          | `"Programada"` \| `"Activa"` \| `"Finalizada"` | Filter by status                          |
| `product_id`      | UUID                                           | Filter by associated product              |
| `category_id`     | UUID                                           | Filter by associated category             |
| `start_date_from` | ISO 8601                                       | Filter promotions starting from this date |
| `end_date_to`     | ISO 8601                                       | Filter promotions ending before this date |

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Summer Sale",
      "discount_type": "percentage",
      "discount_value": 25,
      "start_date": "2025-06-01T00:00:00.000Z",
      "end_date": "2025-08-31T23:59:59.000Z",
      "status": "Programada",
      "products": [...],
      "categories": [...],
      "created_at": "2025-08-27T12:00:00.000Z",
      "updated_at": "2025-08-27T12:00:00.000Z",
      "deleted_at": null
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "size": 10,
    "total_pages": 5
  }
}
```

---

### `GET /api/promotions/summary`

Get promotion summary statistics.

**Response** `200 OK`

```json
{
  "by_status": {
    "Programada": 15,
    "Activa": 8,
    "Finalizada": 19
  },
  "valid_today": 5
}
```

`valid_today` counts promotions with status `Activa` where the current date falls within `[startDate, endDate]`.

---

### `GET /api/promotions/:id`

Get a single promotion by ID.

**Path Parameters**

| Parameter | Type | Description  |
| --------- | ---- | ------------ |
| `id`      | UUID | Promotion ID |

**Response** `200 OK` — Same structure as single item in list response.

**Response** `404 Not Found`

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Promotion not found"
  }
}
```

---

### `PATCH /api/promotions/:id`

Update a promotion. Only `Programada` and `Activa` promotions can be updated.

**Request Body** (all fields optional)

```json
{
  "name": "Updated Name",
  "discount_type": "fixed",
  "discount_value": 10.0,
  "start_date": "2025-07-01T00:00:00Z",
  "end_date": "2025-09-30T23:59:59Z",
  "product_ids": ["uuid-1"],
  "category_ids": ["uuid-2"]
}
```

**Response** `200 OK` — Updated promotion object.

**Response** `409 Conflict` — If promotion is `Finalizada` (immutable).

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Finalizada promotions cannot be modified"
  }
}
```

---

### `POST /api/promotions/:id/activate`

Activate a promotion (Programada → Activa).

**Business Rules**:

- Current status must be `Programada`
- Current date must be within `[startDate, endDate]` (inclusive)

**Response** `200 OK` — Updated promotion with status `Activa`.

**Response** `409 Conflict`

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Promotion cannot be activated outside its validity period"
  }
}
```

---

### `POST /api/promotions/:id/finalize`

Finalize a promotion (Activa → Finalizada).

**Business Rules**:

- Current status must be `Activa`

**Response** `200 OK` — Updated promotion with status `Finalizada`.

**Response** `409 Conflict`

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Only Activa promotions can be finalized"
  }
}
```

---

### `DELETE /api/promotions/:id`

Soft delete a promotion (sets `deletedAt`).

**Business Rules**:

- Current status must be `Programada`
- Sets `deletedAt` timestamp (record preserved in database)

**Response** `204 No Content`

**Response** `409 Conflict`

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Only Programada promotions can be deleted"
  }
}
```

---

## State Machine

Promotions follow a strict lifecycle:

```
Programada ──→ Activa ──→ Finalizada
     │                      (terminal)
     └──→ Deleted
          (terminal)
```

| Transition           | Endpoint             | Constraints                         |
| -------------------- | -------------------- | ----------------------------------- |
| Programada → Activa  | `POST /:id/activate` | Current date within validity period |
| Activa → Finalizada  | `POST /:id/finalize` | None                                |
| Programada → Deleted | `DELETE /:id`        | Soft delete (sets `deletedAt`)      |
| Finalizada → *       | —                    | Immutable (no transitions allowed)  |

---

## Error Responses

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": { ... }
  }
}
```

| HTTP Status | Code                       | When                                         |
| ----------- | -------------------------- | -------------------------------------------- |
| 400         | `VALIDATION_ERROR`         | Invalid request body, query, or params       |
| 404         | `NOT_FOUND`                | Resource not found                           |
| 409         | `INVALID_STATE_TRANSITION` | Invalid status transition or immutable state |
| 500         | `INTERNAL_ERROR`           | Unexpected server error                      |
