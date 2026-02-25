---
sidebar_position: 8
title: Changelog
---

# 📅 Daily Changelog

Documentation of major changes by date to track development progress.

---

## 2026-02-24 — Designer UI Polish & Monitor-Asset Sync
- **Monitor → Asset Library Sync**: Publish components directly from the Monitor to the Registry.
- **Mock Data Auto-population**: Live task data is automatically pasted into the mock data editor.
- **Sidebar Icon Rendering**: Fixed Lucide icon rendering in the Designer sidebar.

---

## 2026-02-23 — Authentication & RLS
- **Authentication**: Email + Google OAuth via Supabase Auth.
- **Retry Logic**: Added UI buttons for task and batch retries.
- **RLS Tightening**: Users only see their own data and public records.

---

## 2026-02-22 — Isolated Batch & N:1 Merge
- **Isolated Batching**: Process root tasks independently.
- **N:1 Merge**: Results from child tasks now merge into a parent task.

---

## 2026-02-21 — Orchestrator Designer
- **Visual Designer**: Node-graph interface via ReactFlow.
- **Stage Config**: Detailed tabs for prompt, IO contracts, and AI settings.

---

## 2026-02-20 — Structured Output
- **Gemini JSON Mode**: Enabled native JSON responses via `responseMimeType`.
- **Robust Parser**: Handles both raw JSON and markdown code blocks.

*Last Updated: 2026-02-24*
