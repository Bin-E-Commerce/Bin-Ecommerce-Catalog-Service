<div align="center">

# Catalog Service

### Product category and attribute master data for seller onboarding and product listing.

NestJS 11 · TypeScript · PostgreSQL · TypeORM · Swagger · Helmet

</div>

---

## The Problem

Marketplace forms are only as good as their master data. If categories and product attributes live inside frontend constants, every seller workflow becomes hard to validate, hard to search, and impossible to evolve across sources like Shopee, Tiki, Lazada, or internal merchandising data.

Catalog Service centralizes category trees and category-specific attributes so seller onboarding and product listing screens can load real, versioned data from the backend instead of duplicating rules in the browser.

---

## See It Work

```bash
# Start the service locally
cd services/catalog-service
cp .env.example .env
npm run dev

# Fetch root categories for seller registration
curl "http://localhost:3003/api/v1/categories?pageSize=10"

# Search categories
curl "http://localhost:3003/api/v1/categories?search=thoi%20trang&pageSize=10"

# Fetch product attributes for a selected category
curl "http://localhost:3003/api/v1/categories/{categoryId}/attributes?includeOptions=true&includeConditional=true"
```

Swagger is available in development at:

```text
http://localhost:3003/docs
```

---

## Quick Start

```bash
cd services/catalog-service
cp .env.example .env
npm install
npm run dev
```

Required local infrastructure:

```text
PostgreSQL database: bin_ecommerce_catalog
Default port:        3003
API prefix:          /api/v1
```

The service expects catalog data to already exist in PostgreSQL. The Shopee category import was intentionally kept outside the runtime API path so production traffic is not coupled to crawler/import scripts.

---

## Trust And Operations

| Concern | How this service handles it |
| --- | --- |
| Network calls | Runtime API only reads PostgreSQL. No external marketplace API is called by request handlers. |
| Database writes | Current public endpoints are read-only. Data changes should come from controlled import/admin workflows. |
| Secrets | Reads only service-scoped environment variables from `.env` locally or secret injection in production. |
| User data | Stores master data only. No customer password, token, or payment data is stored here. |
| Reversibility | Stop the Nest process or remove the `bin_ecommerce_catalog` database to reset local state. |

---

## API Reference

All routes are served under `/api/v1`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/categories` | List active categories with pagination, parent, level, leaf, and search filters. |
| `GET` | `/categories/:id` | Read one active category by UUID. |
| `GET` | `/categories/:id/attributes` | List category attributes and optional select options. |

### `GET /categories`

Query parameters:

| Name | Type | Notes |
| --- | --- | --- |
| `parentId` | UUID | Return direct children of a category. |
| `level` | number | Filter by category depth. |
| `isLeaf` | boolean | Filter categories that can be selected as final leaves. |
| `search` | string | Case-insensitive search by name or slug. |
| `page` | number | Defaults to `1`. |
| `pageSize` | number | Defaults to `50`, max `200`. |

Example response shape:

```json
{
  "items": [
    {
      "id": "6c72d3fa-4d2e-5d99-bba2-b5d81b7a4238",
      "parentId": null,
      "name": "Thời Trang Nam",
      "slug": "thoi-trang-nam",
      "level": 0,
      "isLeaf": false,
      "isActive": true
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 50,
  "totalPages": 1
}
```

### `GET /categories/:id/attributes`

Query parameters:

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `includeOptions` | boolean | `true` | Include dropdown/select options. |
| `includeConditional` | boolean | `true` | Include conditional child attributes. |

---

## Data Model

<details>
<summary><b>Category tree</b></summary>

`categories` stores the marketplace category hierarchy.

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Stable UUID used by internal services. |
| `parent_id` | Self-reference for category trees. |
| `name`, `slug` | Display and URL/search identity. |
| `level`, `path`, `sort_order` | UI ordering and tree rendering. |
| `is_leaf` | Marks final selectable categories. |
| `source_platform`, `external_category_id` | External source identity for idempotent import. |
| `metadata` | Source-specific fields that should not become first-class columns yet. |

</details>

<details>
<summary><b>Category attributes</b></summary>

`category_attributes` defines the form fields required or recommended when listing products under a category.

Supported input types include:

```text
TEXT, TEXTAREA, INTEGER, DECIMAL, BOOLEAN, DATE, DATETIME, SINGLE_SELECT, MULTI_SELECT
```

The schema supports conditional attributes:

```text
parent_attribute_id + trigger_option_id
```

This lets the UI show an attribute only when a seller selects a specific option in another attribute.

</details>

<details>
<summary><b>Attribute options</b></summary>

`category_attribute_options` stores selectable values for attributes such as brand family, material, gender, size group, or product-specific classifications.

Unique indexes prevent duplicate values per attribute and preserve source IDs for safe re-imports.

</details>

---

## Integration Flow

```text
Seller Register UI
  -> API Gateway
  -> Catalog Service: GET /api/v1/categories
  -> Seller selects mainCategoryId
  -> Seller Service validates category by calling Catalog Service
```

Product listing will use the same service later:

```text
Seller selects category
  -> Catalog Service returns attributes/options
  -> Product Service validates product attributes against selected category
```

---

## Engineering Notes

- Nest global prefix and URI versioning are enabled: `/api/v1`.
- `ValidationPipe` uses `whitelist`, `forbidNonWhitelisted`, and implicit conversion.
- Helmet is configured through `common/config/helmet.config.ts`.
- CORS is disabled at the service level because browser traffic should enter through API Gateway.
- TypeORM `synchronize` should be used only for local development.

---

## Scripts

```bash
npm run dev          # Start with Nest watch mode
npm run build        # Compile service
npm run start        # Run compiled service
npm run type-check   # TypeScript noEmit check
npm run lint         # ESLint over src
npm run test         # Jest
```

---

## Environment

See [.env.example](./.env.example).

Production should inject these variables per service through Secret Manager, Kubernetes Secret, ECS Task Definition, or CI/CD secrets. Do not reuse the root local Docker `.env` as a production secret source.

