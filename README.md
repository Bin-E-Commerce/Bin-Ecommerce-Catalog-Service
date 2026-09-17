<p align="center">
  <img src="https://raw.githubusercontent.com/Bin-E-Commerce/Bin-E-Commerce-UI-Web/main/public/images/logo/logo_background_white.png" alt="Bin E-Commerce" width="190" />
</p>

<h1 align="center">Catalog Service</h1>

<p align="center">
  One trusted product vocabulary for categories, attributes, and every seller and storefront experience.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white" alt="NestJS 11" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-TypeORM-336791?logo=postgresql&logoColor=white" alt="PostgreSQL and TypeORM" />
  <img src="https://img.shields.io/badge/OpenAPI-Swagger-85EA2D?logo=swagger&logoColor=111111" alt="OpenAPI Swagger" />
  <img src="https://img.shields.io/badge/REST-master%20data-0F766E" alt="REST master data API" />
</p>

## Contents

1. [Problem](#1-problem)
2. [Service at a glance](#2-service-at-a-glance)
3. [What it owns](#3-what-it-owns)
4. [Architecture](#4-architecture)
5. [Trust surface](#5-trust-surface)
6. [See It Work](#6-see-it-work)
7. [Install](#7-install)
8. [Category Model](#8-category-model)
9. [Attribute Model](#9-attribute-model)
10. [Query and Integration Flow](#10-query-and-integration-flow)
11. [API Surface](#11-api-surface)
12. [Data Integrity](#12-data-integrity)
13. [Project Structure](#13-project-structure)
14. [Configuration Reference](#14-configuration-reference)
15. [Development](#15-development)
16. [Testing Strategy](#16-testing-strategy)
17. [Operational Notes](#17-operational-notes)
18. [Documentation Findings](#18-documentation-findings)
19. [FAQ](#19-faq)
20. [Ownership](#20-ownership)

## 1. Problem

Product creation needs a stable vocabulary. A seller should choose a valid category and provide the attributes that belong to that category, while the storefront should render the same taxonomy consistently. If each client or domain service invents its own category and attribute rules, the platform gradually accumulates incompatible product data.

Typical failure modes without a catalog owner include:

- A product references a category that another service cannot resolve.
- Two screens use different names or IDs for the same category.
- A seller submits an attribute option that is not valid for the selected category.
- Conditional attributes appear without their triggering parent option.
- Search, recommendation and product forms interpret the same taxonomy differently.
- A category is removed even though product data still depends on it.

Catalog Service solves this by owning the category tree and the attribute definitions attached to it. Product Service consumes the catalog contract for product validation; Seller Service uses it while collecting seller/product information; frontend clients use it to render category and attribute controls.

Catalog Service is not a product database. It does not own product price, inventory, reviews, shop ownership or ranking.

## 2. Service at a glance

| Attribute | Value |
| --- | --- |
| Service | catalog-service |
| Default port | 3003 |
| HTTP prefix | /api |
| URI version | v1 |
| Development docs | /docs |
| Health endpoint | /api/v1/health |
| Database | PostgreSQL + TypeORM |
| Primary module | Catalog |
| Persistence mode | Synchronize outside production in current bootstrap |
| API style | Versioned REST read contract |

### Runtime responsibilities

Catalog Service answers:

1. Which categories are active and how are they organized?
2. What attributes are available for a category?
3. Which options can be selected for each attribute?
4. Which records are safe for Product/Seller forms and validation?

The service intentionally exposes a narrow read surface today. Taxonomy writes are expected to be controlled by an import/admin workflow rather than arbitrary public mutation.

## 3. What it owns

| Domain boundary | Catalog Service owns |
| --- | --- |
| Category tree | Parent/child relationship, level, leaf state, slug, sort order and active state |
| Category identity | Local ID and external source/category reference |
| Attribute definition | Display name, slug, input type, required/active state and ordering |
| Attribute dependency | Parent attribute and triggering option relationships |
| Attribute options | Option identity, display value, ordering and active state |
| Read contract | Query filtering, ordering and response DTO shape |

### What it does not own

| Concern | Source of truth |
| --- | --- |
| Product aggregate | Product Service |
| Product price and stock | Product Service |
| Seller/shop | Seller Service |
| Media assets | Media Service |
| Recommendation taxonomy projection | Recommendation Service |
| User/permission | Auth Service and API Gateway |

The external IDs on category and attribute records support synchronization from a source dataset. They are not permission to let clients create arbitrary taxonomy records.

## 4. Architecture

~~~text
Storefront / Seller / Product
            |
            v
      API Gateway
            |
            v
   CategoriesController
            |
            v
      CatalogService
        /       \
       v         v
Category repo  Attribute repo
       \         /
          PostgreSQL
~~~

### Layer responsibilities

- CategoriesController owns HTTP route mapping and query DTO binding.
- CatalogService builds category and attribute queries and validates the requested category.
- TypeORM repositories own persistence access.
- Category, CategoryAttribute and CategoryAttributeOption entities model the taxonomy.
- DTOs define the public query boundary instead of exposing arbitrary database filters.

The service does not call Product Service to answer category queries. Product consumes catalog master data; reversing that dependency would create an unnecessary read cycle.

### Bootstrap contract

The current bootstrap:

- Loads .env.local and .env globally.
- Applies Helmet headers.
- Adds the /api prefix.
- Enables URI versioning with default version 1.
- Applies whitelist, forbidden-field and transform validation.
- Disables direct CORS origins because browser traffic is expected to use the Gateway.
- Exposes Swagger only outside production.
- Enables graceful shutdown.

## 5. Trust surface

<details>
<summary>What Catalog Service trusts and rejects</summary>

### Trusted after validation

- Category IDs parsed by the controller and resolved from PostgreSQL.
- Query values transformed and validated by the global ValidationPipe.
- Active category/attribute/option state read from the database.
- External identifiers stored by a controlled import/admin path.

### Never trusted directly

- A category ID simply because it came from the browser.
- A client-provided category name or slug as proof of identity.
- An inactive option submitted in a product payload.
- A frontend assumption that a category is a leaf or has no dependencies.
- An arbitrary database filter or unbounded query parameter.

Catalog currently exposes read operations. Any future write operation must add explicit administrative authorization, audit logging, input validation and compatibility rules for existing products.

</details>

## 6. See It Work

### 6.1. Start local

~~~powershell
cd services/catalog-service
Copy-Item .env.example .env
npm install
npm run dev
~~~

The service expects PostgreSQL at the values configured in .env.

### 6.2. Check health and OpenAPI

~~~powershell
curl http://localhost:3003/api/v1/health
~~~

Open http://localhost:3003/docs in development to inspect the generated API contract.

### 6.3. Read categories

~~~powershell
curl http://localhost:3003/api/v1/categories
curl "http://localhost:3003/api/v1/categories?search=phone"
curl "http://localhost:3003/api/v1/categories?parentId=<parent-id>&isLeaf=true"
~~~

When the full platform is running, use the equivalent Gateway path under /api/v1/categories. The response only contains active records according to the current application query.

### 6.4. Read category attributes

~~~powershell
curl http://localhost:3003/api/v1/categories/<category-id>/attributes
curl "http://localhost:3003/api/v1/categories/<category-id>/attributes?includeOptions=true"
~~~

The exact optional query fields are defined by ListCategoryAttributesQueryDto. Use Swagger or the DTO source as the final contract when integrating.

## 7. Install

> [!IMPORTANT]
> Catalog Service is a stateful master-data service. It requires PostgreSQL and controlled taxonomy data. Do not commit database credentials and do not use development synchronization as a production schema migration strategy.

### Required dependency

| Dependency | Why it is required |
| --- | --- |
| PostgreSQL | Category, attribute and option persistence |
| API Gateway | Browser-facing security and route aggregation |
| Controlled catalog source | Import/bootstrap data for the taxonomy |

### Local build

~~~powershell
cd services/catalog-service
Copy-Item .env.example .env
npm run type-check
npm run build
npm run start
~~~

### Recovery and rollback

Rollback code does not automatically restore a taxonomy record or its associations. Use migrations/import snapshots for schema/data recovery. If a taxonomy change affects existing products, use a compatibility or deactivation strategy rather than deleting referenced records.

## 8. Category Model

~~~text
Root category
   |
   +--> Child category
           |
           +--> Leaf category used by product forms
~~~

### Category fields

The category entity models:

- Stable local UUID.
- Parent category relationship.
- Hierarchy level.
- Leaf indicator.
- Name and slug used for display/search.
- Sort order.
- Active status.
- External category identifier.
- Timestamps.

### Query behavior

The category list query:

- Returns active categories only.
- Uses parentId when supplied.
- Defaults to root categories when no parent, level or search filter is supplied.
- Supports level filtering.
- Supports leaf filtering.
- Searches lower-cased name or slug.
- Orders by sort order and then name.

This default root behavior is useful for category-tree rendering, while explicit parent/level/search filters support form controls and admin tools.

### Leaf semantics

An isLeaf flag is data from the catalog source, not a permission decision. Product creation should still handle stale taxonomy gracefully and confirm that the selected category is valid for the operation.

## 9. Attribute Model

~~~text
Category
   |
   +--> Attribute
           |
           +--> Option
           |
           +--> Child attribute triggered by an option
~~~

### Attribute capabilities

Category attributes can describe:

- Display name and stable slug.
- Input type such as text, select or multi-select.
- Required/active state.
- Sort order.
- External attribute ID.
- Parent attribute relationship.
- Trigger option for conditional display.
- Minimum/maximum selection limits where supported.

### Option capabilities

Each option belongs to an attribute and has:

- Local ID and external value ID.
- Display value.
- Stable ordering.
- Active state.
- Source metadata where available.

When the query requests options, only active options are joined and ordered. Inactive attributes/options remain persisted for controlled deactivation and historical compatibility, but should not appear in active form data.

### Conditional attributes

A child attribute may depend on a parent attribute and a triggering option. The frontend can use this relationship to reveal conditional inputs, but Product Service remains responsible for validating the final product payload at its own write boundary.

## 10. Query and Integration Flow

### Category read flow

~~~text
Client -> Gateway -> GET /categories
                    -> ValidationPipe
                    -> CatalogService.listCategories
                    -> active category query
                    -> ordered paginated response
~~~

### Attribute read flow

~~~text
Client -> GET /categories/:id/attributes
       -> resolve category existence
       -> filter active attributes
       -> optionally load active options
       -> order attributes/options
       -> return DTO
~~~

The service first resolves the category before listing attributes. A missing category is therefore distinguishable from a valid category with no active attributes.

### Product/Seller integration

~~~text
Seller/Product form
       -> read catalog structure
       -> submit product data
       -> Product Service validates references
       -> persist product-owned data
~~~

Catalog read APIs are not a substitute for write-time validation. A category can be deactivated between form render and product submission.

## 11. API Surface

All application routes, including health, use /api/v1.

### Categories

| Method | Route | Purpose |
| --- | --- | --- |
| GET | /api/v1/categories | List active categories, defaulting to roots |
| GET | /api/v1/categories/:id | Read one active category |
| GET | /api/v1/categories/:id/attributes | Read active attributes and optional active options |
| GET | /api/v1/health | Check process/database health contract |

### Query inputs

Category list supports the DTO-backed concepts:

- parentId for children of a category.
- level for a hierarchy level.
- isLeaf for leaf/non-leaf filtering.
- search for name/slug matching.

Attribute list supports the DTO-backed option-loading behavior. Consult Swagger and the source DTO before depending on optional query names in an external client.

## 12. Data Integrity

### Entity relationships

~~~text
Category 1 ---- * CategoryAttribute
CategoryAttribute 1 ---- * CategoryAttributeOption
Category 1 ---- * Category (parent/children)
~~~

### Uniqueness rules

| Rule | Purpose |
| --- | --- |
| Category hierarchy identity | Keep parent/child references stable |
| Category + external attribute ID | Prevent duplicate imported attributes |
| Category + attribute slug | Keep form field lookup unambiguous |
| Attribute + external option ID | Prevent duplicate imported options |
| Attribute + option value | Keep visible choices unique |

### Active-state rules

Active query results filter inactive categories, attributes and options. Deactivation is safer than hard deletion when products or external imports still reference the record.

### Import compatibility

External IDs help idempotent imports, but an import process must still define conflict resolution, rename behavior, deleted-source behavior and ordering updates. Those rules should not be hidden inside a public read controller.

## 13. Project Structure

~~~text
src/
├── main.ts                              # HTTP bootstrap, validation, versioning, Swagger
├── app.module.ts                        # PostgreSQL and feature composition
├── common/config/                       # Helmet configuration
├── database/
│   └── entities/
│       ├── category.entity.ts
│       ├── category-attribute.entity.ts
│       └── category-attribute-option.entity.ts
└── modules/
    ├── catalog/
    │   ├── application/
    │   │   ├── services/                # Category and attribute queries
    │   │   └── types/                   # Pagination response contract
    │   ├── presentation/
    │   │   ├── controllers/             # CategoriesController
    │   │   └── dto/                     # Category/attribute query DTOs
    │   └── catalog.module.ts
    └── health/
~~~

The presentation layer owns HTTP concerns. CatalogService owns query intent. Entities remain inside the catalog persistence boundary and should not be used as an accidental cross-service contract.

## 14. Configuration Reference

| Variable | Purpose | Example |
| --- | --- | --- |
| NODE_ENV | Runtime mode and Swagger behavior | development |
| PORT | HTTP listener | 3003 |
| APP_VERSION | Application metadata | 1.0.0 |
| TYPEORM_LOGGING | Enable TypeORM logging | false |
| POSTGRES_HOST | PostgreSQL host | localhost |
| POSTGRES_PORT | PostgreSQL port | 5432 |
| POSTGRES_USER | Database user | bin_ecommerce |
| POSTGRES_PASSWORD | Database password | deployment secret |
| POSTGRES_DB | Catalog database | bin_ecommerce_catalog |

Use [.env.example](./.env.example) as the local variable template. Production should inject credentials through deployment secrets and use controlled schema migrations.

## 15. Development

### Commands

| Command | Purpose |
| --- | --- |
| npm run dev | Start Nest watch mode |
| npm run build | Build the service |
| npm run start | Run the built artifact |
| npm run type-check | TypeScript validation without emit |
| npm run lint | ESLint source validation |
| npm test | Run Jest tests |

### Recommended local gate

~~~powershell
npm run type-check
npm run lint
npm test -- --runInBand
npm run build
~~~

For manual UI testing, seed a disposable catalog dataset with root categories, nested children, leaf categories, required attributes, inactive options and at least one conditional attribute.

## 16. Testing Strategy

### Unit tests

Cover:

- Root-category default behavior.
- Parent, level, leaf and search filters.
- Case-insensitive name/slug search.
- Sort order followed by name.
- Missing category behavior.
- Active-only attribute filtering.
- Optional option loading and ordering.
- Conditional attribute relationship mapping.
- DTO transformation and invalid query rejection.

### Integration tests

Use PostgreSQL test infrastructure to verify:

- Category parent/child persistence.
- Attribute and option uniqueness.
- Deactivation filtering.
- External ID import compatibility.
- Query ordering and pagination response shape.
- Database failure behavior.

### Acceptance flow

~~~text
Given an active root category with children
When a client requests the category list without filters
Then root categories are returned in stable order
When a client selects a category and requests attributes
Then active attributes and active options are returned
When an option is deactivated
Then subsequent active attribute reads omit that option
When a category is missing
Then the API returns a clear not-found response
~~~

## 17. Operational Notes

### Dependency health

Monitor PostgreSQL availability, category query latency, connection pool saturation and unexpected empty results after an import. An HTTP process being healthy does not prove that the taxonomy dataset is complete.

### Failure matrix

| Failure | Expected behavior |
| --- | --- |
| PostgreSQL unavailable | Health/read requests fail clearly; no fabricated taxonomy |
| Category not found | Return not-found response |
| Inactive category | Exclude from active list/read contract |
| Inactive option | Exclude from active option joins |
| Invalid query | Reject through validation boundary |
| Import duplicate | Resolve through external/local uniqueness rules |
| Stale client selection | Product/Seller write boundary revalidates |

### Deployment checklist

1. Verify catalog database and schema state.
2. Confirm the dataset has expected roots and active leaf categories.
3. Run a health check and representative category query.
4. Run an attribute query with options.
5. Verify Product/Seller integration uses the correct service URL.
6. Confirm Swagger is not exposed in production.
7. Observe query latency after large taxonomy imports.

## 18. Documentation Findings

The following facts should be verified during deployment:

1. Catalog Service uses port 3003 in its current local environment template.
2. The current bootstrap enables TypeORM synchronization outside production. Treat that as development behavior and use reviewed migrations for deployed schema changes.
3. The service currently exposes read controllers only; public taxonomy mutation is not described as an available route.
4. The category list defaults to active root categories when no parent, level or search filter is provided.
5. Attribute queries validate the category first and can join only active options.
6. External IDs and uniqueness indexes indicate import/synchronization requirements, but an import command is not part of the current HTTP module surface.

This section records current source behavior and integration checks; it does not silently alter runtime configuration.

## 19. FAQ

### Does Catalog Service store products?

No. It stores category taxonomy and attribute definitions. Product Service owns product records.

### Why does Product Service need Catalog Service?

To validate category and attribute references against one master taxonomy instead of duplicating rules.

### Why keep inactive records instead of deleting them?

Deactivation preserves references and import history while removing the record from active read results.

### Does reading an attribute guarantee it is valid at product write time?

No. The product write boundary must validate again because taxonomy may change after a form was rendered.

### Why are external IDs stored?

They support stable synchronization from an external catalog source and help prevent duplicate imports.

### Can the frontend decide whether a category is a leaf?

It can use the returned flag for UX, but the backend remains responsible for validating the selected category during a domain mutation.

## 20. Ownership

### Engineering

**Đào Ngọc Anh**

**Software Engineer**

[View portfolio](https://daongocanh.site)

Software Engineer responsible for the architecture, implementation, integration, and maintenance of this service.

### Architecture & API Design

**Đào Ngọc Anh**

Designed the taxonomy ownership boundary, category hierarchy, attribute dependency model, active-data query contract, import-compatible identifiers, and Product/Seller integration surface.
