# Change: Add Asset Registry

## Why

Currently, custom view components and prompt templates are tightly coupled and duplicated across different stages. Centralizing them in a registry will improve maintainability, facilitate reuse, and allow for standalone refinement of UI components.

## What Changes

- **[NEW]** `custom_components` table in Supabase to house shared React components.
- **[MODIFY]** `prompt_templates` table to reference `custom_components` via ID instead of inline code.
- **[NEW]** Asset Library management dashboard for CRUD operations on templates and components.
- **[MODIFY]** `ComponentEditor` to support standalone editing with mock data.
- **[MODIFY]** `StageConfigPanel` to allow selecting existing components from the registry.

## Impact

- Specs: `specs/assets/spec.md`
- Code: `src/services/stageService.ts`, `src/pages/AssetLibrary.tsx`, `src/components/batch/ComponentEditor.tsx`, `src/components/batch/StageConfigPanel.tsx`
