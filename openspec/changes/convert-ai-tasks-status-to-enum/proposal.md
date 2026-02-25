# Change: Convert ai_tasks Status to Enum

## Why
Currently, the `status` column in the `ai_tasks` table is a plain `text`/`character varying`. This lacks validation at the database level and can lead to inconsistent data. Converting it to a PostgreSQL `ENUM` type will ensure type safety and provide better documentation of the supported task lifecycle states.

## What Changes
- Create a new PostgreSQL enum type `ai_task_status` with values: `plan`, `pending`, `running`, `processing`, `awaiting_approval`, `approved`, `completed`, `generated`, `failed`, `cancelled`, `skipped`.
- **BREAKING**: Change `ai_tasks.status` column type from `character varying(20)` to `ai_task_status`.
- Update the default value for `ai_tasks.status` to `plan`.
- Update the `v_runnable_tasks` view (filtering by `plan` instead of `pending` for initial fetch).
- Update n8n workflows (`Base Agent`, `Load Batch`) to align with the new lifecycle.

## Impact
- **Specs**: `specs/ai-tasks/spec.md` (if exists)
- **Code**: `ai_tasks_schema.sql`, `all-schemas.sql`, `v_runnable_tasks_schema.sql`.
- **Database**: Requires a migration to create the enum type and alter the table.
