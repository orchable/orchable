# Tasks: Add Asset Registry

## 1. Database & Schema
- [x] 1.1 Create migration SQL for `custom_components` table and update `prompt_templates`.
- [x] 1.2 Run migration and verify table structure.

## 2. Service Layer
- [x] 2.1 Implement `getCustomComponents`, `createCustomComponent`, `updateCustomComponent`, `deleteCustomComponent` in `stageService.ts`.
- [x] 2.2 Update template retrieval logic to resolve component ID to code.

## 3. Asset Library UI
- [x] 3.1 Create `AssetLibrary.tsx` with Tabs for Templates and Components.
- [x] 3.2 Implement Grid/List view with basic CRUD operations.

## 4. Component Editor & Integration
- [x] 4.1 Update `ComponentEditor.tsx` to support standalone mode with mock data editor.
- [x] 4.2 Update `StageConfigPanel.tsx` to include component registry selection.
- [/] 4.3 Verify end-to-end flow: Create asset -> Link to template -> View in execution.
