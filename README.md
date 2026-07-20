# Project manager web app

A web application to manage projects, tasks and related resources.

## Index

- [Folders structure](#folders-structure)
- [Backend storage](#backend-storage)
- [REST API Specification](#rest-api-specification)

## Folders structure

```text
docker-project-manager/
├── README.md
├── docker-compose.yml
├── Dockerfile
├── .gitignore
├── .dockerignore
├── backend/                    # Java 21, SpringBoot 4, Gradle 9, Postgre 18, Hibernate 7, Flyway 12
├── frontend/                   # Angular 22 (signals, zoneless, standalone)
└── e2e/                        # Tests E2E Playwright
```

## Backend storage

The backend is **stateful**: projects are persisted server-side so they can be retrieved later by the frontend.

Projects are stored as a single JSONB document per project in a `projects` table, keyed by the stable `{projectId}`. This keeps the project JSON schema flexible (mirroring the native document format described in the API spec) while still benefiting from ACID guarantees, indexed lookups by ID, and easy listing of the project registry.

- **Storage model:** one row per project, with the full project JSON stored in a `JSONB` column; metadata columns (`id`, `name`, `manager`, `company`, `created_at`, `updated_at`) are extracted for fast listing and filtering in the project registry.
- **Lifecycle:** the backend creates, retrieves, updates and deletes projects through the `/projects` endpoints; all other operations load the referenced project from PostgreSQL by `{projectId}`, apply the change, and persist the updated document back to the database.

## REST API Specification

See [`docs/api-specification.md`](docs/api-specification.md) for the full REST API specification.
