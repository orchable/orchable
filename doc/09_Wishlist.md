# 💡 Wishlist — Proposed Features

A list of proposed features and improvements, prioritized by impact and complexity. Implemented features are marked with ✅.

---

## ✅ Implemented (Completed)

| # | Feature | Date Completed |
|---|-----------|-----------------|
| ✅ | UI-based Retry (Retry / Retry All Failed) | 2026-02-23 |
| ✅ | Prompt Manager (Asset Library) | 2026-02-23 |
| ✅ | CSV Result Export | 2026-02-23 |
| ✅ | Task Tree Visualization (TaskHierarchyTree) | 2026-02-22 |
| ✅ | Approval Workflow (requires_approval flag) | 2026-02-22 |
| ✅ | Cost Estimation Calculator | 2026-02-23 |
| ✅ | Custom View Component System | 2026-02-23 |
| ✅ | Authentication (Login + Google OAuth) | 2026-02-23 |
| ✅ | Delete Batch | 2026-02-23 |
| ✅ | Asset Registry (Custom Components Library) | 2026-02-24 |
| ✅ | Monitor → Asset Library Sync | 2026-02-24 |

---

## 🔴 High Priority (High Impact)

### 1. Unified Statistics Dashboard
- **Current State**: The `Home.tsx` page displays static introduction information.
- **Proposal**: Transform the home page into a **Real-time Dashboard**:
  - Total running / completed / failed tasks (last 24h)
  - Throughput chart (tasks/hour) over time
  - API Key Pool health status
  - Top 5 most common errors
- **Difficulty**: ⭐⭐⭐

### 2. UI-based API Key Management
- **Current State**: No UI exists for managing `user_api_keys`.
- **Proposal**: An **API Key Pool** tab in Settings:
  - Displays list of keys and their status (active/blocked)
  - Add/Delete/Reset keys
- **Difficulty**: ⭐⭐⭐

### 3. Prompt Version History
- **Current State**: `prompt_templates` has a `version` column but lacks a rollback UI.
- **Proposal**: View historical versions and perform rollbacks directly from the Asset Library.
- **Difficulty**: ⭐⭐⭐

---

## 🟡 Medium Priority (Nice to Have)

### 4. Dry Run / Preview Mode
- **Proposal**: Test-run a single task with mock data in the Launcher to view the rendered prompt and AI results without saving to the DB.
- **Difficulty**: ⭐⭐⭐

### 5. Webhook & Email Notifications
- **Proposal**: Invoke a custom webhook URL when a batch is `completed` or `failed`. Send summary emails.
- **Difficulty**: ⭐⭐⭐

### 6. Scheduling & Cron Batches
- **Proposal**: Support automated batch creation based on a schedule (cron expression).
- **Difficulty**: ⭐⭐⭐

### 7. "Show Advanced" Toggle in Stage Config
- **Current State**: StageConfigPanel displays all tabs (Basic, Prompt, IO, AI, Hooks, Visual).
- **Proposal**: Hide technical tabs (AI, Hooks) behind a "Show Advanced" button to streamline the UI for new users.
- **Difficulty**: ⭐

---

## 🟢 Low Priority (Future Vision)

### 8. Multi-Model Support
- Support OpenAI, Claude, and Llama via an abstraction layer. Implement fallback chains if the primary model fails.
- **Difficulty**: ⭐⭐⭐⭐

### 9. Plugin System for Pre/Post Processing
- A registry for pre/post plugins (e.g., "Fetch from Google Sheets", "Save to S3") with a drag-and-drop UI for selection.
- **Difficulty**: ⭐⭐⭐⭐⭐

### 10. Component Marketplace
- Publicly share Custom View Components, allowing other users to import them into their Asset Library.
- **Difficulty**: ⭐⭐⭐

---

## Priority Summary (Remaining)

| # | Feature | Priority | Difficulty |
|---|-----------|---------|--------|
| 1 | Statistics Dashboard | 🔴 High | ⭐⭐⭐ |
| 2 | API Key UI | 🔴 High | ⭐⭐⭐ |
| 3 | Version History | 🔴 High | ⭐⭐⭐ |
| 4 | Dry Run | 🟡 Medium | ⭐⭐⭐ |
| 5 | Notifications | 🟡 Medium | ⭐⭐⭐ |
| 6 | Scheduling | 🟡 Medium | ⭐⭐⭐ |
| 7 | Show Advanced Toggle | 🟡 Medium | ⭐ |
| 8 | Multi-Model Support | 🟢 Low | ⭐⭐⭐⭐ |
| 9 | Plugin System | 🟢 Low | ⭐⭐⭐⭐⭐ |
| 10 | Component Marketplace | 🟢 Low | ⭐⭐⭐ |

*Last Updated: 2026-02-24*
