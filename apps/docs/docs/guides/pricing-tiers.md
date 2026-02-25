---
sidebar_position: 6
title: Pricing Tiers
---

# 💎 Pricing Tiers & Feature Matrix

Orchable runs on a unified codebase that progressively unlocks features as users authenticate and upgrade.

---

## 1. Core Tier Model

| Tier | Authentication | Storage Engine | Execution Engine | Cost |
|---|---|---|---|---|
| **Anonymous** | None (Guest) | IndexedDB (Local) | Web Worker → Gemini | Free |
| **Free** | Supabase Auth | IndexedDB + Cloud Sync | Web Worker (Local) | Free |
| **Premium** | Supabase Auth | Cloud-first (Supabase) | Cloud + 24/7 Background | Paid |

---

## 2. Feature Unlock Matrix

| Feature | Anonymous (Guest) | Free (Registered) | Premium (Subscriber) |
|---|:---:|:---:|:---:|
| **Visual Designer** | ✅ | ✅ | ✅ |
| **Batch Execution (local)** | ✅ | ✅ | ✅ |
| **Custom TSX Sandbox** | ✅ | ✅ | ✅ |
| **Export CSV/JSON** | ✅ | ✅ | ✅ |
| **Cost Calculator** | ✅ | ✅ | ✅ |
| **Cloud Sync** | ❌ | ✅ (Limited) | ✅ Unlimited |
| **Persistent History** | ❌ | ✅ Limited | ✅ |
| **Background Processing** | ❌ | ❌ | ✅ |
| **Team Collaboration** | ❌ | ❌ | ✅ |
| **Auto API Key Rotation** | ❌ | ❌ | ✅ |

---

## 3. Storage Behavior

- **Anonymous**: All data resides purely in the browser's IndexedDB. History is lost if browser cache is cleared.
- **Free**: Uses IndexedDB for speed, but enables cloud sync to persist data across sessions and devices.
- **Premium**: Directly reads/writes to Supabase, enabling real-time cross-device sync and server-side background execution.

*Last Updated: 2026-02-24*
