# Backend Architecture

This document describes the architecture, design principles, conventions and storage model of the **docker-project-manager** backend. For the endpoint definitions, request/response schemas and enumerations, see [`api-specification.md`](api-specification.md).

---

## 1. Architecture

### Stateful backend

The API is **stateful**: the backend persists project data in a server-side database (see [Section 3. Storage technology](#3-storage-technology)). Projects are stored, maintained and retrieved through the backend, so the frontend doesn't need to keep local copies or send the full project state in every request. Instead, every operation targets a project by its `{projectId}` path parameter, which the backend resolves against its store.

The backend is the single source of truth for persisted project state: the frontend loads a project from the backend, edits it through the API, and relies on the backend to persist every change. Mutating endpoints return the **updated project JSON** (wrapped in the `{ "project": ... }` envelope) loaded from storage after the change, so the client can refresh its in-memory copy.

### Single-user application

The application is intended for a **single user** working on one project at a time. No multiple users and no concurrency are expected, but the backend keeps a **server-side project registry** so that projects survive across sessions and can be reopened later by the frontend.

### Undo / redo history

The backend also maintains a **per-project undo/redo history**. Every mutating operation pushes the previous project state onto an undo stack, so the frontend can undo and redo changes through dedicated endpoints without keeping any snapshots client-side. The history is scoped to each project and capped to a configurable maximum number of entries. The undo/redo stacks are persisted alongside the project in the backend store, so they survive server restarts; deleting a project also deletes its history. See Section 13 of the [API spec](api-specification.md) for the dedicated endpoints.

### Core feature set

The API is designed around the following core feature set:

- **Projects** — JSON documents with metadata, calendars and view configuration, persisted server-side and addressable by UUID.
- **Tasks** — hierarchical WBS (outline numbers), milestones, project tasks, priorities, colors, notes, web links, costs, custom columns, third-date constraints, completion %, critical path.
- **Task dependencies** — FS / FF / SS / SF constraints, lag (difference), hardness (strong / rubber).
- **Resources** — human resources with roles, days off, custom columns, standard rate / cost.
- **Resource assignments** — load per assignment, coordinator flag, role-in-task.
- **Calendars** — project calendar, resource calendars, exceptions (holidays), working day definitions.
- **Costs** — manual or calculated task costs aggregated from assignments.
- **Custom columns** — typed custom properties (text, integer, double, date, boolean) for tasks and resources.
- **Roles** — configurable role lists used by resources and assignments.
- **Import / Export** — native JSON, Microsoft Project (MPP / MPX), CSV (tasks / resources / assignments), Excel, PDF, PNG, HTML reports.
- **Views / UI state** — visible columns, column order/width, chart zoom, filters, sorting, expanded tasks.

### Exhaustiveness

This specification is intentionally exhaustive: every entity persisted in the project JSON document (`project`, `tasks`, `task`, `depend`, `allocations`, `resource`, `role`, `calendar`, `exceptions`, `custom-columns`, `view`, `task-display-columns`) is exposed through a dedicated endpoint.

---

## 2. API Conventions

### Base URL

`http://localhost/api/v1`

### Authentication

The API is **public**: no authentication is required for any endpoint. Any client can access every endpoint.

### Request and response bodies

- All request and response bodies are `application/json` unless they are binary file streams (`application/octet-stream`, `multipart/form-data`).
- Most operation endpoints no longer require a `project` field in the request body: the backend loads the referenced project from storage using `{projectId}`. Request bodies only carry the operation parameters. Example:
  ```json
  { "taskId": "t1", "patch": { "name": "New name" } }
  ```
- Mutating endpoints return the **updated project state** (loaded from storage after the change) so the client can refresh its in-memory copy:
  ```json
  { "project": { ... } }
  ```
- Query endpoints return the requested data extracted from the stored project:
  ```json
  { "data": ... }
  ```

### Identifiers

- All identifiers are strings (stable UIDs are used for tasks/resources). `{projectId}` is a stable server-side identifier assigned at project creation.
- **Path parameters** (`{projectId}`, `{taskId}`, `{resourceId}`, `{dependencyId}`, `{viewId}`, …) are **server-side identifiers**. `{projectId}` selects the persisted project in the backend store; `{taskId}`, `{resourceId}`, etc. identify entities **within that stored project** and are resolved by the backend against the loaded project.

### Dates

Dates are ISO-8601 (`YYYY-MM-DD`), date-times include offset.

### Binary exports

Binary export endpoints set `Content-Disposition: attachment; filename="<project>.<ext>"` so the frontend can trigger downloads directly.

---

## 3. Storage technology

- **Database:** PostgreSQL 18.
- **ORM / access:** Hibernate 7.
- **Migrations:** Flyway 12.
- **Stack:** Java 21, Spring Boot 4, Gradle 9 (see the root `README.md` for the full folder layout).

### Storage model

Projects are stored as a **single JSONB document per project** in a `projects` table, keyed by the stable `{projectId}`. This keeps the project JSON schema flexible (mirroring the native document format described in the [API spec](api-specification.md)) while still benefiting from ACID guarantees, indexed lookups by ID, and easy listing of the project registry.

- **One row per project**, with the full project JSON stored in a `JSONB` column.
- **Metadata columns** (`id`, `name`, `manager`, `company`, `created_at`, `updated_at`) are extracted from the JSON document into regular columns for fast listing and filtering in the project registry.
- A separate **`project_history`** table stores the per-project **undo/redo stacks** so the backend can revert and reapply changes without any client-side snapshots.

### Lifecycle

The backend is the single source of truth for persisted project state:

- The backend creates, retrieves, updates and deletes projects through the `/projects` endpoints.
- All other operations load the referenced project from PostgreSQL by `{projectId}`, apply the change, and persist the updated document back to the database.
- Every mutating operation also pushes the **previous** project state onto the project's undo stack (capped to a configurable maximum), enabling the dedicated `:undo`, `:redo` and `/history` endpoints (see Section 13 of the [API spec](api-specification.md)).
- The undo/redo stacks are persisted alongside the project in the backend store, so they survive server restarts. Deleting a project also deletes its history.