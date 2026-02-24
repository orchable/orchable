# 📅 Daily Changelog

Documentation of major changes by date to track development progress.

---

## 2026-02-24 — Designer UI Polish & Monitor-Asset Sync
**Author**: Tony Pham & AI Assistant
**Status**: Completed

### 🚀 New Features
- **Monitor → Asset Library Sync**: When "Publish" is clicked in the Monitor, the system allows publishing to the Registry or saving as a local override for the current stage.
- **Linked Component Badge**: The Component Editor in the Monitor displays "Linked to Registry" or "Local Override" badges to indicate status.
- **Auto-populate Mock Data**: When switching to the Mock Data tab in the Component Editor, live task data is automatically pasted if the editor is empty.
- **Sync with Live Data Button**: Added a RefreshCw button in the Mock Data tab to synchronize with live data at any time.

### 🛠️ Bug Fixes
- **Sidebar Icon Rendering**: Fixed an issue where the Designer sidebar displayed icon names as text ("book") instead of actual Lucide icons. It now renders the correct Lucide icon or a max 3-character text abbreviation.
- **Type Safety**: Replaced `any` with `unknown` in `ComponentEditor.tsx` props.

### ⚠️ Breaking Changes
- `TaskHierarchyTree.tsx` has changed `onSave` logic for the `ComponentEditor` — requires importing `createCustomComponent`, `updateCustomComponent`, and `linkTemplateToComponent` from `stageService`.

---

## 2026-02-23 — Authentication, RLS, Retry & Delete
**Author**: Tony Pham & AI Assistant
**Status**: Completed

### 🚀 New Features
- **Authentication**: Added a `Login.tsx` page supporting Email + Google OAuth via Supabase Auth. The `AuthProvider` context protects all routes.
- **Retry Failed Tasks**: Added "Retry" and "Retry All Failed" buttons in the Monitor and BatchProgress views, utilizing the `retry_task` and `retry_all_failed_in_batch` RPCs.
- **Delete Batch**: Added a batch delete button in the Monitor with cascade deletion of sub-tasks via the `delete_batch_cascade` RPC.
- **Export CSV**: Export batch results to CSV from the Monitor and BatchProgress views.
- **Custom Component Editor**: Open the TSX Component editor directly from task details in the Monitor.

### 🛠️ Bug Fixes
- **RLS Tightening**: Strengthened Row Level Security — users only see their own data and records where `is_public = true`.
- **View Config Persistence**: Saves hidden column configurations (`hiddenFields`) to the `view_config` of `prompt_templates`.

### ⚠️ Breaking Changes
- The `20260223_tighten_rls.sql` migration must be applied before deployment.

---

## 2026-02-22 — Isolated Batch Grouping & N:1 Merge
**Author**: Tony Pham & AI Assistant
**Status**: Completed

### 🚀 New Features
- **Isolated Batch Grouping**: Added `batch_grouping: 'isolated'` — each root task is processed independently without merging results.
- **N:1 Merge**: Supported `N:1` cardinality — results from multiple child tasks merge into a single parent task.

---

## 2026-02-21 — Orchestrator Designer & Performance
**Author**: Tony Pham & AI Assistant
**Status**: Completed

### 🚀 New Features
- **Orchestrator Designer (ReactFlow)**: A drag-and-drop interface for designing multi-step AI pipelines.
- **StageConfigPanel**: Detailed configuration panel for each stage with tabs for Basic, Prompt, IO (Contract), AI, Hooks, and Visual settings.
- **ContractSection**: Editor for Input/Output Schema (JSON Schema defining input/output data).
- **IconPicker**: Choose Lucide icons for Stages.
- **Sync to Supabase**: "Save Config" button automatically synchronizes all stages into `prompt_templates` on Supabase.

### 🛠️ Bug Fixes
- Optimized the `v_runnable_tasks` view to reduce query costs.
- Fixed RPC counters for task completion tracking.

---

## 2026-02-20 — Base Agent Structured Output
**Author**: Tony Pham & AI Assistant
**Status**: Completed

### 🚀 New Features
- **Gemini Structured Output**: `stageService.ts` injects `responseMimeType` and `responseJsonSchema` into `generationConfig` during template synchronization, requiring Gemini to return raw JSON instead of Markdown.
- **Robust JSON Parser**: The "Convert MarkdownJSON to JSON" node in the Base Agent handles both raw JSON and JSON within Markdown code blocks.

---

## 2026-02-19 — Script-based Workflow Sync
**Author**: Tony Pham & AI Assistant
**Status**: Completed

### 🛠️ Improvements / Bug Fixes
- **Base Agent Sync**: Fully synchronized Base Agent logic with the Script-based approach.
- **Status Fix**: Tasks now transition from `pending` to `plan`.
- **Bug Fix**: Added `status: 'generated'` updates into Phase 3 to prevent infinite loops.
- **Metadata**: Fixed missing `launch_id` and `user_id` in Phase 5 (Batch mode).

---

## 2026-02-17 — Fix Launch ID Propagation
**Author**: Tony Pham
**Status**: Completed

### 🛠️ Bug Fixes
- SQL Script fix for lost `launch_id` during sub-task creation (v1 and v2).
