# Project Manager — Functional Requirements

## 1. Core Architecture & State

* **REQ-001:** The system shall operate without an authentication or user login layer.
* **REQ-002:** The system shall support a workspace that loads, modifies, and displays exactly one active project at a time.
* **REQ-003:** The system shall provide a dashboard interface to create, rename, delete, and switch between saved projects.
* **REQ-004:** The system shall automatically persist all project data and configurations to server-side storage.
* **REQ-005:** The system shall maintain a fine-grained undo and redo history stack of up to 500 actions per project.
* **REQ-006:** The system shall persist the undo/redo history stack across application restarts and page reloads.

---

## 2. Tasks & Work Breakdown Structure (WBS)

* **REQ-007:** The system shall support an infinitely nestable parent-child hierarchy for tasks and summary tasks.
* **REQ-008:** The system shall store task metadata including milestones, priority levels, custom color tags, markdown notes, and web hyperlinks.
* **REQ-009:** The system shall track task completion progress as a percentage value from 0% to 100%.
* **REQ-010:** The system shall automatically calculate task start/end dates, overall duration, and project-wide roll-ups using a Critical Path Method (CPM) scheduling engine.
* **REQ-011:** The system shall enforce date constraints including *Must Start On*, *Start No Earlier Than*, and strict deadlines.

---

## 3. Task Dependencies & Linkages

* **REQ-012:** The system shall support four dependency relationships between tasks: Finish-to-Start (FS), Finish-to-Finish (FF), Start-to-Start (SS), and Start-to-Finish (SF).
* **REQ-013:** The system shall allow positive or negative time offsets (lags/leads) on all task dependencies.
* **REQ-014:** The system shall enforce rigid chronological rules for dependencies designated as **Strong**.
* **REQ-015:** The system shall automatically recalculate dates or flag warnings without breaking logic for dependencies designated as **Rubber**.

---

## 4. Resource & Calendar Management

* **REQ-016:** The system shall manage resource profiles containing roles, standard hourly rates, overtime rates, and cost-per-use values.
* **REQ-017:** The system shall allow resources to be assigned to tasks with variable allocation percentages.
* **REQ-018:** The system shall display visual warning indicators when a resource’s combined assignments exceed their maximum calendar capacity on any given day.
* **REQ-019:** The system shall maintain a global project calendar defining standard working days, shift hours, and holidays.
* **REQ-020:** The system shall maintain individual resource calendars that override the global calendar for vacations, sick leave, and specific shifts.

---

## 5. Costing & Performance Baselines

* **REQ-021:** The system shall calculate project costs using either manual fixed entries or dynamic calculations derived from resource assignment rates and durations.
* **REQ-022:** The system shall capture and store immutable baseline snapshots of the project schedule and cost matrix.
* **REQ-023:** The system shall calculate variance metrics comparing current project progress against saved baselines.

---

## 6. View Configuration & UI Persistence

* **REQ-024:** The system shall save and restore the user’s exact grid configuration, including visible columns, column order, and column widths.
* **REQ-025:** The system shall save and restore the Gantt chart timeline zoom level, applied filters, multi-column sorting rules, and the expanded/collapsed state of the WBS tree.

---

## 7. Data Integration & Export Reporting

* **REQ-026:** The system shall initialize or restore a complete project state by importing a structured JSON file.
* **REQ-027:** The system shall export the raw project data structure to a **JSON** file.
* **REQ-028:** The system shall export project tabular data to **CSV** and **Excel** formats.
* **REQ-029:** The system shall generate printable **HTML reports** and **PDF** documents matching the active view layout.
* **REQ-030:** The system shall generate high-resolution **PNG** image exports of the active Gantt timeline chart.
