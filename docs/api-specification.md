# REST API Specification — docker-project-manager

This document defines the REST API endpoints that the backend of **docker-project-manager** must expose. It contains only the endpoint definitions and the schemas/enumerations directly referenced by them.

For the surrounding context see: [`backend-architecture.md`](backend-architecture.md).

---

## 1. Projects

Builds, persists, retrieves and inspects project JSON documents. Projects are stored server-side and addressed by `{projectId}`. The backend maintains the project registry; the frontend creates a project once and reopens it later by ID.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/projects` | Query: `nameContains` (optional) | `{ "data": ProjectSummary[] }` (200) | Lists all projects stored in the backend registry (metadata only). |
| POST | `/projects` | `ProjectCreate` | `{ "project": Project }` (201) | Creates and persists a new empty project (default calendar and role list). |
| GET | `/projects/{projectId}` | — | `{ "project": Project }` (200) | Retrieves the full stored project by ID. |
| PATCH | `/projects/{projectId}` | `ProjectUpdate` | `{ "project": Project }` (200) | Partially updates project metadata (name, description, manager, company, dates, locale, `defaultCurrency`, webLink). |
| DELETE | `/projects/{projectId}` | — | `204` | Deletes the stored project, all its contents, and its undo/redo history. |
| GET | `/projects/{projectId}/validation` | — | `{ "data": ValidationReport }` (200) | Validates the stored project and returns errors/warnings. Read-only; does not affect undo/redo history. |
| GET | `/projects/{projectId}/summary` | — | `{ "data": ProjectSummary }` (200) | Returns aggregated stats: task count, milestones, completion %, total cost, critical path duration. |
| POST | `/projects/{projectId}:clone` | `{ "name": string }` | `{ "project": Project }` (201) | Creates a deep copy of the project with a new name. All entity IDs (tasks, resources, dependencies, assignments, roles, views, custom columns) are regenerated and internal references are remapped consistently. Persists it as a new project. |

### `Project` schema
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "manager": "string",
  "company": "string",
  "startDate": "2026-01-01",
  "finishDate": "2026-12-31",
  "schemaVersion": "3.4",
  "locale": "en",
  "defaultCurrency": "EUR",
  "webLink": "string",
  "createdAt": "2026-07-20T10:00:00Z",
  "updatedAt": "2026-07-20T10:00:00Z"
}
```
`schemaVersion` identifies the project document schema (used for migrations); it is not a user-facing version number. `defaultCurrency` is used whenever a `Cost` does not specify its own currency.

### `ProjectSummary` schema
```json
{
  "id": "string",
  "name": "string",
  "manager": "string",
  "company": "string",
  "taskCount": 0,
  "milestoneCount": 0,
  "completionPercent": 0,
  "totalCost": 0.0,
  "currency": "EUR",
  "criticalPathDurationDays": 0,
  "updatedAt": "2026-07-20T10:00:00Z"
}
```

### `ValidationReport` schema
```json
{
  "valid": true,
  "errors": [{ "code": "string", "message": "string", "taskId": "string|null" }],
  "warnings": [{ "code": "string", "message": "string", "taskId": "string|null" }]
}
```

---

## 2. Tasks

Manages the task tree (WBS). Tasks support nesting (supertask / subtasks), milestones, project tasks, priorities, colors, notes, web links, third-date constraints, completion %, custom columns and a critical-path flag. All endpoints target a persisted project by `{projectId}`.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/projects/{projectId}/tasks` | Query: `parentId`, `milestone` (bool), `critical` (bool), `expand` (bool, include full subtree) — all optional | `{ "data": Task[] }` (200) | Returns the task tree (or a filtered subtree) extracted from the stored project. |
| GET | `/projects/{projectId}/tasks/{taskId}` | — | `{ "data": Task }` (200) | Returns a single task with all attributes. |
| POST | `/projects/{projectId}/tasks` | `{ "task": TaskCreate }` | `{ "project": Project }` (201) | Creates a task. If `parentId` is set, nests it under that parent. |
| PATCH | `/projects/{projectId}/tasks/{taskId}` | `{ "patch": TaskUpdate }` | `{ "project": Project }` (200) | Updates any subset of task attributes (name, dates, duration, priority, color, notes, webLink, completion, milestone, projectTask, expand, thirdDate). `resourceIds`, `predecessorIds` and `cost` are read-only here — see Sections 3, 5 and 9. |
| DELETE | `/projects/{projectId}/tasks/{taskId}` | Query: `cascade` (bool, default `false`) | `{ "project": Project }` (200) | Deletes a task. With `cascade=true`, all descendants — and any dependencies/assignments referencing the task or its descendants — are removed. With `cascade=false` (default), children are reparented to the deleted task's parent; dependencies and assignments belonging to the deleted task are removed. |
| POST | `/projects/{projectId}/tasks/{taskId}:move` | `{ "parentId": string\|null, "position": int }` | `{ "project": Project }` (200) | Moves a task under a new parent and/or to a specific position in the outline. |
| POST | `/projects/{projectId}/tasks/{taskId}:indent` | `{ "direction": "in\|out" }` | `{ "project": Project }` (200) | Indents or outdents a task in the WBS hierarchy. |
| POST | `/projects/{projectId}/tasks/{taskId}:shift` | `{ "deltaDays": int }` | `{ "project": Project }` (200) | Shifts the task start/end by a number of days, respecting the calendar. |
| GET | `/projects/{projectId}/tasks/{taskId}/activities` | — | `{ "data": TaskActivity[] }` (200) | Returns the working activities (slices) computed from the calendar. |
| GET | `/projects/{projectId}/tasks/{taskId}/critical-path` | — | `{ "data": Task[] }` (200) | Returns the chain of tasks on the critical path that contains this task. |
| GET | `/projects/{projectId}/tasks/{taskId}/notes` | — | `{ "data": { "notes": string } }` (200) | Returns the rich-text notes of the task. |
| PATCH | `/projects/{projectId}/tasks/{taskId}/notes` | `{ "notes": string }` | `{ "project": Project }` (200) | Updates the task notes. |

### `Task` schema
```json
{
  "id": "string",
  "uid": "string|null",
  "name": "string",
  "parentId": "string|null",
  "outlineNumber": "1.2.3",
  "start": "2026-01-01",
  "end": "2026-01-10",
  "duration": 5,
  "durationUnit": "DAY",
  "completion": 60,
  "isMilestone": false,
  "isProjectTask": false,
  "isCritical": false,
  "priority": "NORMAL",
  "color": "#FF0000",
  "webLink": "https://...",
  "expand": true,
  "thirdDate": "2026-01-05",
  "thirdDateConstraint": "NONE",
  "cost": { "isCalculated": false, "manualValue": 0.0, "value": 0.0, "currency": "EUR" },
  "predecessorIds": ["string"],
  "resourceIds": ["string"],
  "notes": "string"
}
```
- `id` is the stable server-side identifier used throughout the API. `uid` is populated only for tasks imported from, or destined for, Microsoft Project (MPP/MPX) round-tripping, to preserve the original file's identifier; it is `null` for natively created tasks.
- `predecessorIds` and `resourceIds` are **derived, read-only** convenience fields, computed from the Dependencies (Section 3) and Assignments (Section 5) collections. They're included here so a client can render a Gantt row without extra calls, but changing them requires the Dependency/Assignment endpoints.
- `thirdDate` / `thirdDateConstraint` model one additional constraint date beyond the task's own start/end (e.g. "must not start before X" while otherwise unconstrained), equivalent to a third-date/SNET-style constraint in tools like ProjectLibre or MS Project. `thirdDateConstraint: "NONE"` means the constraint is inactive and `thirdDate` is ignored.

`priority` enum: `TaskPriority`. `durationUnit` enum: `TimeUnit`.

---

## 3. Task Dependencies

Manages relationships between tasks (predecessors / successors). The application supports four constraint types plus a lag (difference) and a hardness flag. All endpoints target a persisted project by `{projectId}`.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/projects/{projectId}/dependencies` | Query: `taskId`, `predecessorId`, `successorId`, `type` — all optional | `{ "data": Dependency[] }` (200) | Lists dependencies, optionally filtered by task (either side), predecessor, successor, or constraint type. |
| GET | `/projects/{projectId}/dependencies/{dependencyId}` | — | `{ "data": Dependency }` (200) | Returns a single dependency. |
| POST | `/projects/{projectId}/dependencies` | `{ "dependency": DependencyCreate }` | `{ "project": Project }` (201) | Creates a dependency between a predecessor and a successor task. |
| PATCH | `/projects/{projectId}/dependencies/{dependencyId}` | `{ "patch": DependencyUpdate }` | `{ "project": Project }` (200) | Updates constraint type, lag or hardness. |
| DELETE | `/projects/{projectId}/dependencies/{dependencyId}` | — | `{ "project": Project }` (200) | Removes a dependency. |

### `Dependency` schema
```json
{
  "id": "string",
  "predecessorId": "string",
  "successorId": "string",
  "type": "FS",
  "lag": 0,
  "hardness": "STRONG"
}
```
`type` enum: `DependencyType` (`FS` Finish-Start, `FF` Finish-Finish, `SS` Start-Start, `SF` Start-Finish). `hardness` enum: `DependencyHardness`.

---

## 4. Resources

Manages human resources. Each resource has a name, role, default rate, days off and custom columns. All endpoints target a persisted project by `{projectId}`.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/projects/{projectId}/resources` | Query: `search`, `roleId` — optional | `{ "data": Resource[] }` (200) | Lists resources of the project. |
| GET | `/projects/{projectId}/resources/{resourceId}` | — | `{ "data": Resource }` (200) | Returns a single resource. |
| POST | `/projects/{projectId}/resources` | `{ "resource": ResourceCreate }` | `{ "project": Project }` (201) | Creates a resource. |
| PATCH | `/projects/{projectId}/resources/{resourceId}` | `{ "patch": ResourceUpdate }` | `{ "project": Project }` (200) | Updates name, role, rate, contact, phone, mail, default color. |
| DELETE | `/projects/{projectId}/resources/{resourceId}` | — | `{ "project": Project }` (200) | Deletes a resource and removes its assignments. |
| GET | `/projects/{projectId}/resources/{resourceId}/assignments` | — | `{ "data": Assignment[] }` (200) | Lists all task assignments of the resource. |
| GET | `/projects/{projectId}/resources/{resourceId}/days-off` | — | `{ "data": DayOff[] }` (200) | Returns the resource's days off. |
| POST | `/projects/{projectId}/resources/{resourceId}/days-off` | `{ "dayOff": DayOffCreate }` | `{ "project": Project }` (201) | Adds a day-off interval. |
| PATCH | `/projects/{projectId}/resources/{resourceId}/days-off/{dayOffId}` | `{ "patch": DayOffUpdate }` | `{ "project": Project }` (200) | Updates a day-off interval. |
| DELETE | `/projects/{projectId}/resources/{resourceId}/days-off/{dayOffId}` | — | `{ "project": Project }` (200) | Removes a day-off interval. |
| GET | `/projects/{projectId}/resources/{resourceId}/load` | Query: `from`, `to` (required) | `{ "data": ResourceLoad[] }` (200) | Returns the resource's workload per day in the given range. |

### `Resource` schema
```json
{
  "id": "string",
  "name": "string",
  "roleId": "string|null",
  "rate": 0.0,
  "phone": "string",
  "mail": "string",
  "defaultColor": "#0000FF",
  "assignmentIds": ["string"]
}
```
`assignmentIds` is derived/read-only; full assignment detail is available via `/resources/{resourceId}/assignments`.

### `DayOff` schema
```json
{ "id": "string", "from": "2026-08-01", "to": "2026-08-15", "reason": "string" }
```

### `ResourceLoad` schema
```json
{ "date": "2026-01-05", "loadPercent": 100, "assignedHours": 8 }
```

---

## 5. Resource Assignments

Manages the assignment of a resource to a task, including load, coordinator flag and role-in-task. All endpoints target a persisted project by `{projectId}`.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/projects/{projectId}/assignments` | Query: `taskId`, `resourceId` — optional | `{ "data": Assignment[] }` (200) | Lists assignments, optionally filtered by task or resource. |
| GET | `/projects/{projectId}/assignments/{assignmentId}` | — | `{ "data": Assignment }` (200) | Returns a single assignment. |
| POST | `/projects/{projectId}/assignments` | `{ "assignment": AssignmentCreate }` | `{ "project": Project }` (201) | Assigns a resource to a task with a load and optional coordinator flag. |
| PATCH | `/projects/{projectId}/assignments/{assignmentId}` | `{ "patch": AssignmentUpdate }` | `{ "project": Project }` (200) | Updates load, coordinator flag or role-in-task. |
| DELETE | `/projects/{projectId}/assignments/{assignmentId}` | — | `{ "project": Project }` (200) | Removes an assignment. |

### `Assignment` schema
```json
{
  "id": "string",
  "taskId": "string",
  "resourceId": "string",
  "load": 100,
  "coordinator": false,
  "roleInTaskId": "string|null"
}
```
`load` is a percentage (0–100) of the resource's full-time load on the task. `coordinator` is the single source of truth for "who coordinates this task" — at most one assignment per task should have `coordinator: true`; the backend rejects a second.

---

## 6. Roles

Manages the configurable role list used by resources and assignments. All endpoints target a persisted project by `{projectId}`.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/projects/{projectId}/roles` | — | `{ "data": Role[] }` (200) | Lists all roles defined in the project. |
| POST | `/projects/{projectId}/roles` | `{ "role": RoleCreate }` | `{ "project": Project }` (201) | Creates a role. |
| PATCH | `/projects/{projectId}/roles/{roleId}` | `{ "patch": RoleUpdate }` | `{ "project": Project }` (200) | Updates a role's name/color. |
| DELETE | `/projects/{projectId}/roles/{roleId}` | Query: `reassignRoleId` (optional) | `{ "project": Project }` (200) | Deletes a role. Resources using it are reassigned to `reassignRoleId`; if omitted, they become roleless (`roleId: null`). |
| GET | `/projects/{projectId}/role-sets` | — | `{ "data": RoleSet[] }` (200) | Returns the available role sets (default, custom). |
| POST | `/projects/{projectId}/role-sets/{roleSetId}:apply` | — | `{ "project": Project }` (200) | Replaces the project's role list with the given role set. Existing resources are matched to the new set by role name where possible; unmatched resources become roleless (`roleId: null`). |

### `Role` schema
```json
{ "id": "string", "name": "string", "color": "#00FF00" }
```

### `RoleSet` schema
```json
{ "id": "string", "name": "Default", "roles": ["Role"] }
```

---

## 7. Calendars

Manages the project calendar and per-resource calendars, including working days, exceptions (holidays) and working hours. All endpoints target a persisted project by `{projectId}`.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/projects/{projectId}/calendar` | — | `{ "data": Calendar }` (200) | Returns the project calendar definition. |
| PATCH | `/projects/{projectId}/calendar` | `{ "patch": CalendarUpdate }` | `{ "project": Project }` (200) | Updates the project calendar (working days, week length, default hours). |
| GET | `/projects/{projectId}/calendar/exceptions` | Query: `from`, `to` — optional | `{ "data": CalendarException[] }` (200) | Lists calendar exceptions (holidays / special working days). |
| POST | `/projects/{projectId}/calendar/exceptions` | `{ "exception": CalendarExceptionCreate }` | `{ "project": Project }` (201) | Adds a calendar exception. |
| PATCH | `/projects/{projectId}/calendar/exceptions/{exceptionId}` | `{ "patch": CalendarExceptionUpdate }` | `{ "project": Project }` (200) | Updates a calendar exception. |
| DELETE | `/projects/{projectId}/calendar/exceptions/{exceptionId}` | — | `{ "project": Project }` (200) | Removes a calendar exception. |
| GET | `/projects/{projectId}/calendar/working-days` | Query: `from`, `to` (required) | `{ "data": WorkingDay[] }` (200) | Returns working vs. non-working days in the range. |
| GET | `/projects/{projectId}/resources/{resourceId}/calendar` | — | `{ "data": Calendar }` (200) | Returns the resource-specific calendar (project calendar + days off), or the override if one exists. |
| PATCH | `/projects/{projectId}/resources/{resourceId}/calendar` | `{ "patch": CalendarUpdate }` | `{ "project": Project }` (200) | Overrides the resource calendar. |

### `Calendar` schema
```json
{
  "id": "string",
  "weekLengthDays": 5,
  "workingDays": [1, 2, 3, 4, 5],
  "defaultWorkingHours": { "from": "08:00", "to": "17:00" },
  "exceptions": ["CalendarException"]
}
```

### `CalendarException` schema
```json
{ "id": "string", "date": "2026-08-15", "isWorking": false, "label": "Local holiday" }
```

### `WorkingDay` schema
```json
{ "date": "2026-08-15", "isWorking": false }
```

---

## 8. Custom Columns

Manages typed custom properties for tasks and resources (text, integer, double, date, boolean). All endpoints target a persisted project by `{projectId}`.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/projects/{projectId}/custom-columns` | Query: `scope` (`task`\|`resource`) — optional | `{ "data": CustomColumnDef[] }` (200) | Lists custom column definitions. |
| POST | `/projects/{projectId}/custom-columns` | `{ "column": CustomColumnDefCreate }` | `{ "project": Project }` (201) | Creates a custom column. |
| PATCH | `/projects/{projectId}/custom-columns/{columnId}` | `{ "patch": CustomColumnDefUpdate }` | `{ "project": Project }` (200) | Updates name, type or default value. |
| DELETE | `/projects/{projectId}/custom-columns/{columnId}` | — | `{ "project": Project }` (200) | Deletes a custom column and all its values. |
| GET | `/projects/{projectId}/tasks/{taskId}/custom-values` | — | `{ "data": CustomValue[] }` (200) | Returns custom column values for a task. |
| PATCH | `/projects/{projectId}/tasks/{taskId}/custom-values` | `{ "values": CustomValue[] }` | `{ "project": Project }` (200) | Bulk-updates custom values for a task. |
| GET | `/projects/{projectId}/resources/{resourceId}/custom-values` | — | `{ "data": CustomValue[] }` (200) | Returns custom column values for a resource. |
| PATCH | `/projects/{projectId}/resources/{resourceId}/custom-values` | `{ "values": CustomValue[] }` | `{ "project": Project }` (200) | Bulk-updates custom values for a resource. |

### `CustomColumnDef` schema
```json
{
  "id": "string",
  "name": "string",
  "scope": "TASK",
  "type": "TEXT",
  "defaultValue": "any"
}
```
`scope` enum: `CustomColumnScope`. `type` enum: `CustomPropertyType`.

### `CustomValue` schema
```json
{ "columnId": "string", "value": "any" }
```

---

## 9. Costs

Manages task and project cost calculation. A task cost can be manual or calculated from resource assignments (load × rate × duration). All endpoints target a persisted project by `{projectId}`.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/projects/{projectId}/costs/summary` | — | `{ "data": CostSummary }` (200) | Returns total project cost, broken down by task and by resource. |
| GET | `/projects/{projectId}/tasks/{taskId}/cost` | — | `{ "data": Cost }` (200) | Returns the cost of a single task (manual or calculated from assignments). |
| PATCH | `/projects/{projectId}/tasks/{taskId}/cost` | `{ "cost": CostUpdate }` | `{ "project": Project }` (200) | Sets the cost mode (calculated/manual) and manual value. |
| GET | `/projects/{projectId}/resources/{resourceId}/cost` | Query: `from`, `to` (required) | `{ "data": ResourceCost }` (200) | Returns the total cost generated by a resource in the range. |

### `Cost` schema
```json
{
  "isCalculated": true,
  "manualValue": 0.0,
  "value": 1234.56,
  "currency": "EUR"
}
```
If `currency` is omitted when setting a cost, the project's `defaultCurrency` is used.

### `CostSummary` schema
```json
{
  "totalCost": 12345.67,
  "currency": "EUR",
  "byTask": [{ "taskId": "string", "cost": 0.0 }],
  "byResource": [{ "resourceId": "string", "cost": 0.0 }]
}
```

### `ResourceCost` schema
```json
{ "resourceId": "string", "from": "2026-01-01", "to": "2026-01-31", "cost": 1234.56, "currency": "EUR" }
```

---

## 10. Views & UI State

Persists the user-interface configuration of the application: visible columns, column order/width, chart zoom, filters, sorting and expanded tasks. Mirrors the `view` and `task-display-columns` sections of the native project JSON file. All endpoints target a persisted project by `{projectId}`.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/projects/{projectId}/views` | — | `{ "data": View[] }` (200) | Lists saved views (Gantt, Resource, Resource chart). |
| POST | `/projects/{projectId}/views` | `{ "view": ViewCreate }` | `{ "project": Project }` (201) | Saves a new view configuration. |
| PATCH | `/projects/{projectId}/views/{viewId}` | `{ "patch": ViewUpdate }` | `{ "project": Project }` (200) | Updates a saved view. |
| DELETE | `/projects/{projectId}/views/{viewId}` | — | `{ "project": Project }` (200) | Deletes a saved view. |
| GET | `/projects/{projectId}/views/{viewId}/columns` | Query: `scope` (`task`\|`resource`) | `{ "data": ColumnConfig[] }` (200) | Returns the visible column configuration for the view. |
| PATCH | `/projects/{projectId}/views/{viewId}/columns` | `{ "columns": ColumnConfig[] }` | `{ "project": Project }` (200) | Updates visible columns, order and width. |
| GET | `/projects/{projectId}/views/{viewId}/filters` | — | `{ "data": Filter[] }` (200) | Returns the active filters. |
| PATCH | `/projects/{projectId}/views/{viewId}/filters` | `{ "filters": Filter[] }` | `{ "project": Project }` (200) | Updates the active filters. |
| GET | `/projects/{projectId}/views/{viewId}/expanded-tasks` | — | `{ "data": { "taskIds": string[] } }` (200) | Returns the IDs of expanded tasks. |
| PATCH | `/projects/{projectId}/views/{viewId}/expanded-tasks` | `{ "taskIds": string[] }` | `{ "project": Project }` (200) | Updates the set of expanded tasks. |
| GET | `/projects/{projectId}/views/{viewId}/chart-options` | — | `{ "data": ChartOptions }` (200) | Returns zoom, label visibility, colors and other chart rendering options. |
| PATCH | `/projects/{projectId}/views/{viewId}/chart-options` | `{ "options": ChartOptions }` | `{ "project": Project }` (200) | Updates chart rendering options. |

### `View` schema
```json
{
  "id": "string",
  "name": "Gantt",
  "type": "GANTT",
  "zoom": "WEEK",
  "columns": ["ColumnConfig"],
  "filters": ["Filter"],
  "sort": [{ "field": "string", "direction": "asc" }]
}
```
`type` enum: `ViewType`. `zoom` enum: `ZoomLevel`.

### `ColumnConfig` schema
```json
{ "field": "string", "visible": true, "order": 0, "width": 120 }
```

### `Filter` schema
```json
{ "field": "string", "operator": "eq", "value": "any" }
```
`operator` values: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`.

### `ChartOptions` schema
```json
{ "zoom": "WEEK", "showLabels": true, "showCriticalPath": true, "barColor": "#4285F4" }
```

---

## 11. Import / Export

Endpoints to convert between the native JSON project format, Microsoft Project, CSV, Excel, PDF, PNG and HTML reports. Import parses an uploaded file and persists the resulting project; export/report endpoints read the stored project by `{projectId}` and return a binary stream.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects:import` | `multipart/form-data` (`file`, `format=json\|msproject\|csv-tasks\|csv-resources\|csv-assignments\|excel`, `mergeProjectId` optional) | `{ "report": ImportReport, "project": Project }` (201) | Parses an uploaded file and persists the resulting project. If `mergeProjectId` is given, merges it into that project instead: all imported IDs are regenerated to avoid collisions, and any references the importer could not resolve are listed in `ImportReport.warnings`. |
| GET | `/projects/{projectId}/export` | Query: `format` (required, `json\|msproject\|csv-tasks\|csv-resources\|csv-assignments\|excel\|pdf\|png\|html`), `viewId`, `locale` — optional | binary stream (200) | Exports the stored project (or a specific view) in the requested format. Sets `Content-Disposition: attachment; filename="<project>.<ext>"`. |
| GET | `/projects/{projectId}/reports/gantt` | Query: `viewId`, `locale`, `paper` (`A4\|A3\|Letter`), `orientation` (`portrait\|landscape`) — all optional | `application/pdf` (200) | Generates a printable Gantt chart PDF from the stored project. |
| GET | `/projects/{projectId}/reports/resources` | Query: `locale`, `paper` — optional | `application/pdf` (200) | Generates a resource load report PDF from the stored project. |
| GET | `/projects/{projectId}/reports/wbs` | Query: `locale` — optional | `application/pdf` (200) | Generates a WBS / task list report PDF from the stored project. |

### `ImportReport` schema
```json
{
  "importedTasks": 0,
  "importedResources": 0,
  "importedAssignments": 0,
  "errors": ["string"],
  "warnings": ["string"]
}
```

---

## 12. Undo / Redo

The backend maintains a per-project undo/redo history so the frontend can revert or reapply changes without storing any snapshots client-side.

- Every **mutating endpoint** (any `POST` create/action, `PATCH`, or `DELETE` that changes the stored project — including task/resource/dependency/assignment/calendar/custom-column/view/cost mutations, project metadata updates, imports and clones) automatically pushes the **previous** project state onto the project's **undo stack** before persisting the new state, and clears the **redo stack**.
- `:undo` pops the top of the undo stack, restores it as the current project state, and pushes the replaced state onto the redo stack.
- `:redo` pops the top of the redo stack, restores it as the current project state, and pushes the replaced state back onto the undo stack.
- History is **scoped per project** and **capped** to a configurable maximum number of entries (oldest entries are dropped when the cap is exceeded). The cap is reported by `GET /projects/{projectId}/history`.
- The undo/redo stacks are persisted alongside the project in the backend store, so they survive server restarts; deleting a project also deletes its history.
- Read-only endpoints (every `GET`) never record history.
- `:undo`, `:redo` and clearing history do **not** themselves push onto the undo stack — `:undo`/`:redo` only move entries between the undo and redo stacks.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects/{projectId}:undo` | — | `{ "project": Project }` (200) | Reverts the project to its previous state, pushing the reverted state onto the redo stack. `409` if there is nothing to undo. |
| POST | `/projects/{projectId}:redo` | — | `{ "project": Project }` (200) | Reapplies the next redo entry, pushing the replaced state back onto the undo stack. `409` if there is nothing to redo. |
| GET | `/projects/{projectId}/history` | Query: `includeEntries` (bool, default `false`) | `{ "data": HistoryReport }` (200) | Returns undo/redo counts, the history cap, and — if `includeEntries=true` — the ordered entry list. |
| DELETE | `/projects/{projectId}/history` | Query: `keep` (`none\|current`, default `current`) | `204` | Clears the undo and redo stacks. With `keep=current`, the current state is preserved as the sole undo entry; with `keep=none`, both stacks are emptied. |

### `HistoryReport` schema
```json
{
  "undoCount": 0,
  "redoCount": 0,
  "maxEntries": 50,
  "entries": [
    { "id": "string", "operation": "tasks:create", "timestamp": "2026-07-20T10:00:00Z" }
  ]
}
```
`entries` is present only when `includeEntries=true`, and lists the undo stack newest-to-oldest. `operation` is a stable label identifying the endpoint that produced the change (e.g. `tasks:create`, `tasks:update`, `resources:delete`, `calendar:update`, `projects:import`).

---

## 13. System & Health

Operational endpoints. These are the only endpoints that do not target a project, use plain `GET` with no path parameters, and return their payload **unwrapped** (no `data`/`project` envelope) since they're static server-side metadata (backend version, supported formats, locale list, default templates).

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/health` | — | `{ "status": "UP" }` | Liveness probe. |
| GET | `/info` | — | `SystemInfo` | Returns backend version, project schema version, supported import/export formats. |
| GET | `/locales` | — | `Locale[]` | Returns the list of available UI locales. |
| GET | `/defaults` | — | `Defaults` | Returns default values: priority, colors, default role set, calendar template. |

### `SystemInfo` schema
```json
{
  "backendVersion": "1.4.0",
  "projectSchemaVersion": "3.4",
  "importFormats": ["json", "msproject", "csv-tasks", "csv-resources", "csv-assignments", "excel"],
  "exportFormats": ["json", "msproject", "csv-tasks", "csv-resources", "csv-assignments", "excel", "pdf", "png", "html"]
}
```

### `Locale` schema
```json
{ "code": "en", "label": "English" }
```

### `Defaults` schema
```json
{
  "priority": "NORMAL",
  "taskColor": "#4285F4",
  "resourceColor": "#0000FF",
  "roleSetId": "string",
  "calendarTemplateId": "string"
}
```

---

## Enumerations reference

| Enum | Values |
|---|---|
| `TaskPriority` | `LOW`, `NORMAL`, `HIGH`, `HIGHEST` |
| `TimeUnit` | `MINUTE`, `HOUR`, `DAY`, `WEEK`, `MONTH` |
| `DependencyType` | `FS` (Finish-Start), `FF` (Finish-Finish), `SS` (Start-Start), `SF` (Start-Finish) |
| `DependencyHardness` | `STRONG`, `RUBBER` |
| `ThirdDateConstraint` | `NONE`, `EARLIEST_BEGIN` |
| `CustomPropertyType` | `TEXT`, `INTEGER`, `DOUBLE`, `DATE`, `BOOLEAN` |
| `CustomColumnScope` | `TASK`, `RESOURCE` |
| `ViewType` | `GANTT`, `RESOURCE`, `RESOURCE_CHART` |
| `ZoomLevel` | `DAY`, `WEEK`, `MONTH`, `QUARTER`, `YEAR` |
| `ImportFormat` | `json`, `msproject`, `csv-tasks`, `csv-resources`, `csv-assignments`, `excel` |
| `ExportFormat` | `json`, `msproject`, `csv-tasks`, `csv-resources`, `csv-assignments`, `excel`, `pdf`, `png`, `html` |
