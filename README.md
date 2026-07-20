# Project manager web app

A web application to manage projects, tasks and related resources.

## Functional specifications

See [`docs/functional-specifications.md`](docs/functional-specifications.md) for the full functional requirements specification.

## Folder structure

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

## Docker container architecture

TODO

## REST API specification

See [`docs/api-specification.md`](docs/api-specification.md) for endpoint definitions, request/response schemas and enumerations.

## Backend architecture

See [`docs/backend-architecture.md`](docs/backend-architecture.md) for the full architecture, conventions and storage details.

## Frontend architecture

TODO
