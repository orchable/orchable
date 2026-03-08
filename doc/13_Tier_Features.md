# Orchable - Tier Features Matrix

Based on the [Orchable Lite 3-Tier Architecture Implementation Plan](../.gemini/antigravity/brain/61d7ae40-8496-4369-aac4-1ae545aa47a2/implementation_plan.md.resolved.13), Orchable runs on a unified codebase that progressively unlocks features as users authenticate and upgrade.

## 1. Core Tier Model

| Tier | Authentication | Storage Engine | Execution Engine | Cost |
| --- | --- | --- | --- | --- |
| **Anonymous** | None (Guest) | IndexedDB (Local only) | Web Worker → Direct Gemini API | Free |
| **Free** | Supabase Auth | IndexedDB + Cloud Sync (Supabase) | Web Worker (Local) | Free |
| **Premium** | Supabase Auth | Cloud-first (Supabase) | Cloud + 24/7 Background | Paid |

---

## 2. Feature Unlock Matrix

| Feature | Anonymous (Guest) | Free (Registered) | Premium (Subscriber) |
| --- | :---: | :---: | :---: |
| **Visual Designer** | ✅ | ✅ | ✅ |
| **Batch Execution (local web worker)** | ✅ | ✅ | ✅ |
| **Custom TSX Sandbox** | ✅ | ✅ | ✅ |
| **Export CSV/JSON** | ✅ | ✅ | ✅ |
| **Cost Calculator** | ✅ | ✅ | ✅ |
| **Cloud sync (Storage)** | ❌ | ✅ (100 tasks/mo) | ✅ Unlimited |
| **Persistent History across devices** | ❌ (Cleared if cache deleted) | ✅ (Cloud-persistent) | ✅ |
| **Background Processing (Cloud)** | ❌ | ❌ | ✅ |
| **Team Workspace & Collaboration** | ❌ | ❌ | ✅ |
| **Auto API Key Rotation** | ❌ | ❌ | ✅ |
| **Custom Server Environment** | ❌ | ❌ | ✅ (n8n background) |

---

## 3. Storage Behavior by Tier

- **Anonymous**: All data (Batches, Tasks, Templates, Components) resdies purely in the browser's IndexedDB. If the user clears browser data or changes devices, the history is lost.
- **Free**: Uses IndexedDB for quick local execution, but enables pushing completed batches and pulling templates to/from Supabase to persist data across sessions/devices.
- **Premium**: Directly reads/writes to Supabase, enabling cross-device real-time sync and server-side execution of long-running workflows while the browser is closed.

_This document outlines the target feature gates implemented via the TierContext system._
