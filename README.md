# Project manager web app

A web application to manage projects, tasks and related resources.

## Index

- [Folders structure](#folders-structure)
- [Backend architecture](#backend-architecture)
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

## Backend architecture

See [`docs/backend-architecture.md`](docs/backend-architecture.md) for the full architecture, conventions and storage details.

## REST API Specification

See [`docs/api-specification.md`](docs/api-specification.md) for endpoint definitions (tables), request/response schemas and enumerations.
