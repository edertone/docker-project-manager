# REST API Specification — docker-project-manager

This document defines the REST API endpoints that the backend of **docker-project-manager** must expose. It contains only the endpoint definitions and the schemas/enumerations directly referenced by them.

For the surrounding context see: [`backend-architecture.md`](backend-architecture.md).

---

## 1. Projects

Builds, persists, retrieves and inspects project JSON documents. Projects are stored server-side and addressed by `{projectId}`. The backend maintains the project registry; the frontend creates a project once and reopens it later by ID.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/projects` | — | `ProjectSummary[]` (200) | Lists all projects stored in the backend registry (metadata only). |
| POST | `/projects` | `ProjectCreate` | `{ "project": Project }` (201) | Creates and persists a new empty project (default calendar and role list) in the backend store. Returns the stored project. |
| GET | `/projects/{projectId}` | — | `{ "project": Project }` (200) | Retrieves the full stored project by ID. |
| PUT | `/projects/{projectId}` | `ProjectUpdate` | `{ "project": Project }` (200) | Replaces the stored project metadata (name, description, manager, company, dates, locale, webLink). Returns the updated project. |
| DELETE | `/projects/{projectId}` | — | `204` | Deletes the stored project and all its contents. |
| POST | `/projects/{projectId}:validate` | — | `ValidationReport` (200) | Validates the stored project and returns errors/warnings. |
| POST | `/projects/{projectId}:summary` | — | `ProjectSummary` (200) | Returns aggregated stats for the stored project: task count, milestones, completion %, total cost, critical path duration. |
| POST | `/projects/{projectId}:clone` | `{ "name": string }` | `{ "project": Project }` (201) | Creates a deep copy of the stored project with a new name and regenerated IDs, persists it as a new project, and returns it. |
| POST | `/projects/{projectId}:undo` | — | `{ "project": Project }` (200) | Reverts the stored project to its previous state in the undo history, pushes the reverted state onto the redo stack, and returns the resulting project. Returns `409` if there is nothing to undo. |
| POST | `/projects/{projectId}:redo` | — | `{ "project": Project }` (200) | Reapplies the next entry from the redo history, pushes the replaced state back onto the undo stack, and returns the resulting project. Returns `409` if there is nothing to redo. |
| GET | `/projects/{projectId}/history` | — | `HistoryReport` (200) | Returns the current undo/redo history state for the project: number of available undo and redo entries, the history cap, and an optional ordered list of history entries (timestamps and operation labels). |
| POST | `/projects/{projectId}/history:clear` | `{ "keep": "none\|current" }` | `204` | Clears the undo and redo stacks for the project. With `keep=none` both stacks are emptied; with `keep=current` (default) the current state is preserved as the only undo entry. |

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
  "version": "3.4",
  "locale": "en",
  "webLink": "string",
  "createdAt": "2026-07-20T10:00:00Z",
  "updatedAt": "2026-07-20T10:00:00Z"
}
```

---

## 2. Tasks

Manages the task tree (WBS). Tasks support nesting (supertask / subtasks), milestones, project tasks, priorities, colors, notes, web links, costs, third-date constraints, completion %, custom columns and critical path flag. All endpoints target a persisted project by `{projectId}` and return the updated project state loaded from storage.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects/{projectId}/tasks:query` | `{ "expand": bool, "parentId": string, "milestone": bool, "critical": bool }` | `Task[]` | Returns the task tree (or a subtree) extracted from the stored project. |
| POST | `/projects/{projectId}/tasks/{taskId}:get` | — | `Task` | Returns a single task with all attributes. |
| POST | `/projects/{projectId}/tasks` | `{ "task": TaskCreate }` | `Project` (200) | Creates a task. If `parentId` is set, the task is nested under that parent. Returns the updated project. |
| POST | `/projects/{projectId}/tasks/{taskId}:update` | `{ "patch": TaskUpdate }` | `Project` (200) | Updates any subset of task attributes (name, dates, duration, priority, color, notes, webLink, completion, milestone, projectTask, expand, cost). Returns the updated project. |
| POST | `/projects/{projectId}/tasks/{taskId}:delete` | `{ "cascade": bool }` | `Project` (200) | Deletes a task. With `cascade=true` all descendants are removed; otherwise children are reparented to the deleted task's parent. Returns the updated project. |
| POST | `/projects/{projectId}/tasks/{taskId}:move` | `{ "parentId": string\|null, "position": int }` | `Project` (200) | Moves a task under a new parent and/or to a specific position in the outline. Returns the updated project. |
| POST | `/projects/{projectId}/tasks/{taskId}:indent` | `{ "direction": "in\|out" }` | `Project` (200) | Indents or outdents a task in the WBS hierarchy. Returns the updated project. |
| POST | `/projects/{projectId}/tasks/{taskId}:shift` | `{ "deltaDays": int }` | `Project` (200) | Shifts the task start/end by a number of days, respecting calendar. Returns the updated project. |
| POST | `/projects/{projectId}/tasks/{taskId}:activities` | — | `TaskActivity[]` | Returns the list of working activities (slices) computed from the calendar. |
| POST | `/projects/{projectId}/tasks/{taskId}:critical-path` | — | `Task[]` | Returns the chain of tasks on the critical path that contains this task. |
| POST | `/projects/{projectId}/tasks/{taskId}/notes:get` | — | `{ "notes": "string" }` | Returns the rich-text notes of the task. |
| POST | `/projects/{projectId}/tasks/{taskId}/notes:set` | `{ "notes": string }` | `Project` (200) | Updates the task notes. Returns the updated project. |
| POST | `/projects/{projectId}/tasks/{taskId}/cost:get` | — | `Cost` | Returns the task cost (manual or calculated from assignments). |
| POST | `/projects/{projectId}/tasks/{taskId}/cost:set` | `{ "cost": CostUpdate }` | `Project` (200) | Sets the cost as manual value or switches to calculated mode. Returns the updated project. |

### `Task` schema
```json
{
  "id": "string",
  "uid": "string",
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
  "thirdDateConstraint": "EARLIEST_BEGIN|NONE",
  "cost": { "isCalculated": false, "manualValue": 0.0, "value": 0.0 },
  "coordinator": "string|null",
  "resources": ["string"],
  "predecessors": ["string"],
  "notes": "string"
}
```

`priority` enum: `LOW`, `NORMAL`, `HIGH`, `HIGHEST`.
`durationUnit` enum: `DAY`, `HOUR`, `WEEK`, `MONTH`, `MINUTE`.

---

## 3. Task Dependencies

Manages relationships between tasks (predecessors / successors). The application supports four constraint types and a lag (difference) plus a hardness flag. All endpoints target a persisted project by `{projectId}` and return the updated project state loaded from storage.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects/{projectId}/dependencies:query` | `{ "taskId": string, "dependantId": string, "dependeeId": string, "type": string }` | `Dependency[]` | Lists dependencies, optionally filtered by task or constraint type. |
| POST | `/projects/{projectId}/dependencies` | `{ "dependency": DependencyCreate }` | `Project` (200) | Creates a dependency between a dependant (successor) and a dependee (predecessor) task. Returns the updated project. |
| POST | `/projects/{projectId}/dependencies/{dependencyId}:update` | `{ "patch": DependencyUpdate }` | `Project` (200) | Updates constraint type, lag or hardness. Returns the updated project. |
| POST | `/projects/{projectId}/dependencies/{dependencyId}:delete` | — | `Project` (200) | Removes a dependency. Returns the updated project. |

### `Dependency` schema
```json
{
  "id": "string",
  "dependantId": "string",
  "dependeeId": "string",
  "type": "FS|FF|SS|SF",
  "lag": 0,
  "hardness": "STRONG|RUBBER"
}
```
`type` enum: `FS` (Finish-Start), `FF` (Finish-Finish), `SS` (Start-Start), `SF` (Start-Finish).

---

## 4. Resources

Manages human resources. Each resource has a name, role, default rate, days off, custom columns and a list of assignments. All endpoints target a persisted project by `{projectId}` and return the updated project state loaded from storage.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects/{projectId}/resources:query` | `{ "search": string, "roleId": string }` | `Resource[]` | Lists resources of the project. |
| POST | `/projects/{projectId}/resources/{resourceId}:get` | — | `Resource` | Returns a single resource. |
| POST | `/projects/{projectId}/resources` | `{ "resource": ResourceCreate }` | `Project` (200) | Creates a resource. Returns the updated project. |
| POST | `/projects/{projectId}/resources/{resourceId}:update` | `{ "patch": ResourceUpdate }` | `Project` (200) | Updates name, role, rate, contact, phone, mail, default color. Returns the updated project. |
| POST | `/projects/{projectId}/resources/{resourceId}:delete` | — | `Project` (200) | Deletes a resource and removes its assignments. Returns the updated project. |
| POST | `/projects/{projectId}/resources/{resourceId}/assignments:list` | — | `Assignment[]` | Lists all task assignments of the resource. |
| POST | `/projects/{projectId}/resources/{resourceId}/days-off:list` | — | `DayOff[]` | Returns the resource's days off. |
| POST | `/projects/{projectId}/resources/{resourceId}/days-off` | `{ "dayOff": DayOffCreate }` | `Project` (200) | Adds a day-off interval. Returns the updated project. |
| POST | `/projects/{projectId}/resources/{resourceId}/days-off/{dayOffId}:update` | `{ "patch": DayOffUpdate }` | `Project` (200) | Updates a day-off interval. Returns the updated project. |
| POST | `/projects/{projectId}/resources/{resourceId}/days-off/{dayOffId}:delete` | — | `Project` (200) | Removes a day-off interval. Returns the updated project. |
| POST | `/projects/{projectId}/resources/{resourceId}/load` | `{ "from": date, "to": date }` | `ResourceLoad[]` | Returns the resource workload per day in the given range. |

### `Resource` schema
```json
{
  "id": "string",
  "name": "string",
  "roleId": "string",
  "rate": 0.0,
  "phone": "string",
  "mail": "string",
  "defaultColor": "#0000FF",
  "assignments": ["Assignment"]
}
```

---

## 5. Resource Assignments

Manages the assignment of a resource to a task, including load, coordinator flag and role-in-task. All endpoints target a persisted project by `{projectId}` and return the updated project state loaded from storage.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects/{projectId}/assignments:query` | `{ "taskId": string, "resourceId": string }` | `Assignment[]` | Lists assignments, optionally filtered by task or resource. |
| POST | `/projects/{projectId}/assignments/{assignmentId}:get` | — | `Assignment` | Returns a single assignment. |
| POST | `/projects/{projectId}/assignments` | `{ "assignment": AssignmentCreate }` | `Project` (200) | Assigns a resource to a task with a load and optional coordinator flag. Returns the updated project. |
| POST | `/projects/{projectId}/assignments/{assignmentId}:update` | `{ "patch": AssignmentUpdate }` | `Project` (200) | Updates load, coordinator flag or role-in-task. Returns the updated project. |
| POST | `/projects/{projectId}/assignments/{assignmentId}:delete` | — | `Project` (200) | Removes an assignment. Returns the updated project. |

### `Assignment` schema
```json
{
  "id": "string",
  "taskId": "string",
  "resourceId": "string",
  "load": 100,
  "coordinator": false,
  "roleInTaskId": "string"
}
```
`load` is a percentage (0–100) of the resource's full-time load on the task.

---

## 6. Roles

Manages the configurable role list used by resources and assignments. All endpoints target a persisted project by `{projectId}` and return the updated project state loaded from storage.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects/{projectId}/roles:list` | — | `Role[]` | Lists all roles defined in the project. |
| POST | `/projects/{projectId}/roles` | `{ "role": RoleCreate }` | `Project` (200) | Creates a role. Returns the updated project. |
| POST | `/projects/{projectId}/roles/{roleId}:update` | `{ "patch": RoleUpdate }` | `Project` (200) | Updates a role name / color. Returns the updated project. |
| POST | `/projects/{projectId}/roles/{roleId}:delete` | `{ "reassignRoleId": string }` | `Project` (200) | Deletes a role; resources using it are reassigned to `reassignRoleId`. Returns the updated project. |
| POST | `/projects/{projectId}/role-sets:list` | — | `RoleSet[]` | Returns the available role sets (default, custom). |
| POST | `/projects/{projectId}/role-sets:apply` | `{ "roleSetId": string }` | `Project` (200) | Replaces the project role list with a predefined role set. Returns the updated project. |

### `Role` schema
```json
{ "id": "string", "name": "string", "color": "#00FF00" }
```

---

## 7. Calendars

Manages the project calendar and per-resource calendars, including working days, exceptions (holidays) and working hours. All endpoints target a persisted project by `{projectId}` and return the updated project state loaded from storage.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects/{projectId}/calendar:get` | — | `Calendar` | Returns the project calendar definition. |
| POST | `/projects/{projectId}/calendar:update` | `{ "patch": CalendarUpdate }` | `Project` (200) | Updates the project calendar (working days, week length, default hours). Returns the updated project. |
| POST | `/projects/{projectId}/calendar/exceptions:list` | `{ "from": date, "to": date }` | `CalendarException[]` | Lists calendar exceptions (holidays / special working days). |
| POST | `/projects/{projectId}/calendar/exceptions` | `{ "exception": CalendarExceptionCreate }` | `Project` (200) | Adds a calendar exception. Returns the updated project. |
| POST | `/projects/{projectId}/calendar/exceptions/{exceptionId}:update` | `{ "patch": CalendarExceptionUpdate }` | `Project` (200) | Updates a calendar exception. Returns the updated project. |
| POST | `/projects/{projectId}/calendar/exceptions/{exceptionId}:delete` | — | `Project` (200) | Removes a calendar exception. Returns the updated project. |
| POST | `/projects/{projectId}/resources/{resourceId}/calendar:get` | — | `Calendar` | Returns the resource-specific calendar (derived from project calendar + days off). |
| POST | `/projects/{projectId}/resources/{resourceId}/calendar:update` | `{ "patch": CalendarUpdate }` | `Project` (200) | Overrides the resource calendar. Returns the updated project. |
| POST | `/projects/{projectId}/calendar/working-days` | `{ "from": date, "to": date }` | `WorkingDay[]` | Returns the list of working vs non-working days in the range. |

### `Calendar` schema
```json
{
  "id": "string",
  "weekLengthDays": 5,
  "workingDays": [1,2,3,4,5],
  "defaultWorkingHours": { "from": "08:00", "to": "17:00" },
  "exceptions": ["CalendarException"]
}
```

---

## 8. Custom Columns

Manages typed custom properties for tasks and resources (text, integer, double, date, boolean). All endpoints target a persisted project by `{projectId}` and return the updated project state loaded from storage.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects/{projectId}/custom-columns:list` | `{ "scope": "task\|resource" }` | `CustomColumnDef[]` | Lists custom column definitions. |
| POST | `/projects/{projectId}/custom-columns` | `{ "column": CustomColumnDefCreate }` | `Project` (200) | Creates a custom column. Returns the updated project. |
| POST | `/projects/{projectId}/custom-columns/{columnId}:update` | `{ "patch": CustomColumnDefUpdate }` | `Project` (200) | Updates name, type or default value. Returns the updated project. |
| POST | `/projects/{projectId}/custom-columns/{columnId}:delete` | — | `Project` (200) | Deletes a custom column and all its values. Returns the updated project. |
| POST | `/projects/{projectId}/tasks/{taskId}/custom-values:get` | — | `CustomValue[]` | Returns custom column values for a task. |
| POST | `/projects/{projectId}/tasks/{taskId}/custom-values:set` | `{ "values": CustomValue[] }` | `Project` (200) | Bulk updates custom values for a task. Returns the updated project. |
| POST | `/projects/{projectId}/resources/{resourceId}/custom-values:get` | — | `CustomValue[]` | Returns custom column values for a resource. |
| POST | `/projects/{projectId}/resources/{resourceId}/custom-values:set` | `{ "values": CustomValue[] }` | `Project` (200) | Bulk updates custom values for a resource. Returns the updated project. |

### `CustomColumnDef` schema
```json
{
  "id": "string",
  "name": "string",
  "scope": "TASK|RESOURCE",
  "type": "TEXT|INTEGER|DOUBLE|DATE|BOOLEAN",
  "defaultValue": "any"
}
```

---

## 9. Costs

Manages task and project cost calculation. A task cost can be manual or calculated from resource assignments (load × rate × duration). All endpoints target a persisted project by `{projectId}` and return the updated project state loaded from storage.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects/{projectId}/costs/summary` | — | `CostSummary` | Returns total project cost, broken down by task and by resource. |
| POST | `/projects/{projectId}/tasks/{taskId}/cost:get` | — | `Cost` | Returns the cost of a single task. |
| POST | `/projects/{projectId}/tasks/{taskId}/cost:set` | `{ "cost": CostUpdate }` | `Project` (200) | Sets the cost mode (calculated/manual) and manual value. Returns the updated project. |
| POST | `/projects/{projectId}/resources/{resourceId}/cost` | `{ "from": date, "to": date }` | `ResourceCost` | Returns the total cost generated by a resource in the range. |

### `Cost` schema
```json
{
  "isCalculated": true,
  "manualValue": 0.0,
  "value": 1234.56,
  "currency": "EUR"
}
```

---

## 10. Views & UI State

Persists the user-interface configuration of the application: visible columns, column order/width, chart zoom, filters, sorting and expanded tasks. Mirrors the `view` and `task-display-columns` sections of the project JSON file. All endpoints target a persisted project by `{projectId}` and return the updated project state loaded from storage.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects/{projectId}/views:list` | — | `View[]` | Lists saved views (Gantt, Resource, Resource chart). |
| POST | `/projects/{projectId}/views` | `{ "view": ViewCreate }` | `Project` (200) | Saves a new view configuration. Returns the updated project. |
| POST | `/projects/{projectId}/views/{viewId}:update` | `{ "patch": ViewUpdate }` | `Project` (200) | Updates a saved view. Returns the updated project. |
| POST | `/projects/{projectId}/views/{viewId}:delete` | — | `Project` (200) | Deletes a saved view. Returns the updated project. |
| POST | `/projects/{projectId}/views/{viewId}/columns:get` | `{ "scope": "task\|resource" }` | `ColumnConfig[]` | Returns the visible column configuration for the view. |
| POST | `/projects/{projectId}/views/{viewId}/columns:set` | `{ "columns": ColumnConfig[] }` | `Project` (200) | Updates visible columns, order and width. Returns the updated project. |
| POST | `/projects/{projectId}/views/{viewId}/filters:get` | — | `Filter[]` | Returns the active filters. |
| POST | `/projects/{projectId}/views/{viewId}/filters:set` | `{ "filters": Filter[] }` | `Project` (200) | Updates the active filters. Returns the updated project. |
| POST | `/projects/{projectId}/views/{viewId}/expanded-tasks:get` | — | `string[]` | Returns the IDs of expanded tasks. |
| POST | `/projects/{projectId}/views/{viewId}/expanded-tasks:set` | `{ "taskIds": string[] }` | `Project` (200) | Updates the set of expanded tasks. Returns the updated project. |
| POST | `/projects/{projectId}/views/{viewId}/chart-options:get` | — | `ChartOptions` | Returns zoom, label visibility, colors and other chart rendering options. |
| POST | `/projects/{projectId}/views/{viewId}/chart-options:set` | `{ "options": ChartOptions }` | `Project` (200) | Updates chart rendering options. Returns the updated project. |

### `View` schema
```json
{
  "id": "string",
  "name": "Gantt",
  "type": "GANTT|RESOURCE|RESOURCE_CHART",
  "zoom": "DAY|WEEK|MONTH|QUARTER|YEAR",
  "columns": ["ColumnConfig"],
  "filters": ["Filter"],
  "sort": [{ "field": "string", "direction": "asc|desc" }]
}
```

---

## 11. Import / Export

Endpoints to convert between the native JSON project format, Microsoft Project, CSV, Excel, PDF, PNG and HTML reports. Import endpoints take an uploaded file, persist the resulting project in the backend store, and return its identifier; export endpoints read the stored project by `{projectId}` and return a binary stream.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects:import` | `multipart/form-data` (`file`, `format=json\|msproject\|csv-tasks\|csv-resources\|csv-assignments\|excel`, `mergeProjectId` optional) | `ImportReport` (with `project`) (201) | Parses an uploaded file, persists the resulting project in the backend store, and returns it (optionally merging it into the stored project identified by `mergeProjectId`). |
| POST | `/projects/{projectId}/export` | `{ "format": "json\|msproject\|csv-tasks\|csv-resources\|csv-assignments\|excel\|pdf\|png\|html", "viewId": string, "locale": string }` | binary stream (200) | Exports the stored project (or a specific view) in the requested format. |
| POST | `/projects/{projectId}/reports/gantt` | `{ "viewId": string, "locale": string, "paper": "A4\|A3\|Letter", "orientation": "portrait\|landscape" }` | `application/pdf` | Generates a printable Gantt chart PDF from the stored project. |
| POST | `/projects/{projectId}/reports/resources` | `{ "locale": string, "paper": string }` | `application/pdf` | Generates a resource load report PDF from the stored project. |
| POST | `/projects/{projectId}/reports/wbs` | `{ "locale": string }` | `application/pdf` | Generates a WBS / task list report PDF from the stored project. |

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

## 13. Undo / Redo

The backend maintains a per-project undo/redo history so the frontend can revert or reapply changes without storing any snapshots client-side.

- Every **mutating endpoint** (any operation that changes the stored project, including task/resource/dependency/assignment/calendar/custom-column/view/cost mutations, project metadata updates, imports and clones) automatically pushes the **previous** project state onto the project's **undo stack** before persisting the new state, and clears the **redo stack**.
- `:undo` pops the top of the undo stack, restores it as the current project state, and pushes the replaced state onto the redo stack.
- `:redo` pops the top of the redo stack, restores it as the current project state, and pushes the replaced state back onto the undo stack.
- History is **scoped per project** and **capped** to a configurable maximum number of entries (oldest entries are dropped when the cap is exceeded). The cap is reported by `/projects/{projectId}/history`.
- History is **not versioned across sessions by default**: the undo/redo stacks are persisted alongside the project in the backend store, so they survive server restarts, but deleting a project also deletes its history.
- Query endpoints (e.g. `:get`, `:query`, `:list`, `:summary`, `:validate`, `cost:get`, `load`, `working-days`, `activities`, `critical-path`) do **not** record history.
- `:undo`, `:redo` and `history:clear` themselves do **not** push onto the undo stack; `:undo`/`:redo` only move entries between the undo and redo stacks.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| POST | `/projects/{projectId}:undo` | — | `{ "project": Project }` (200) | Reverts the stored project to its previous state in the undo history, pushes the reverted state onto the redo stack, and returns the resulting project. `409` if there is nothing to undo. |
| POST | `/projects/{projectId}:redo` | — | `{ "project": Project }` (200) | Reapplies the next entry from the redo history, pushes the replaced state back onto the undo stack, and returns the resulting project. `409` if there is nothing to redo. |
| GET | `/projects/{projectId}/history` | — | `HistoryReport` (200) | Returns the current undo/redo history state for the project. |
| POST | `/projects/{projectId}/history:clear` | `{ "keep": "none\|current" }` | `204` | Clears the undo and redo stacks for the project. |

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
`entries` is optional and lists the undo stack from newest to oldest when requested; `operation` is a stable label identifying the endpoint that produced the change (e.g. `tasks:create`, `tasks:update`, `resources:delete`, `calendar:update`, `projects:import`).

---

## 12. System & Health

Operational endpoints. These are the only endpoints that do not require a project in the body. They use `GET` because they return static, server-side metadata (backend version, supported formats, locale list, default templates) that does not depend on any project state. All other endpoints use `POST` because they target a persisted project by `{projectId}`.

| Method | Endpoint | Body | Returns | Functional description |
|---|---|---|---|---|
| GET | `/health` | — | `{ "status": "UP" }` | Liveness probe. |
| GET | `/info` | — | `SystemInfo` | Returns backend version, project schema version, supported import/export formats. |
| GET | `/locales` | — | `Locale[]` | Returns the list of available UI locales. |
| GET | `/defaults` | — | `Defaults` | Returns default values: priorities, colors, role sets, calendar templates. |

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
