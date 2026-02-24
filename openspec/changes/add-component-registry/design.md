# Design: Asset Registry

## Context
The system currently allows users to define custom React components for visualizing task outputs. However, these are stored as inline text within prompt templates, leading to duplication and difficulty in managing common UI patterns.

## Goals
- Provide a centralized repository for reusable UI components.
- Allow independent development and testing of UI components using mock data.
- decouple UI presentation from prompt logic.

## Decisions

### 1. Database Linkage
We will use a nullable foreign key `custom_component_id` in `prompt_templates`. If NULL, the system can fallback to a default generic renderer or inline code (for backward compatibility during migration).

### 2. Standalone Editor
The `ComponentEditor` will be refactored into a more generic component that accepts `code` and `data` as props. In registry mode, `data` will come from a `mock_data` field in the database.

### 3. Permissions (RLS)
`custom_components` will follow the same RLS patterns as batches and tasks:
- `is_public`: Can be viewed by all authenticated users.
- `created_by`: Only the owner can edit or delete.

## Risks / Trade-offs
- **Migration Complexity**: Existing inline components need to be extracted carefully to avoid breaking current executions.
- **Dependency Management**: Deleting a component in the registry might break templates that depend on it. We should implement a "Used By" check.

## Open Questions
- Should we support versioning for custom components? (Out of scope for initial registry MVP).
- Should we provide "Starter Templates" (e.g., Table, Chart) as read-only system assets?
