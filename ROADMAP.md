# 🗺️ Orchable Roadmap

This document outlines the planned features, priority tiers, and future vision for the Orchable platform.

---

## 💡 Feature Wishlist

### 🔴 High Priority
- **Unified Statistics Dashboard**: Transform the home page into a real-time dashboard with throughput charts, API Key Pool health status, and error frequency analysis.
- **UI-based API Key Management**: An **API Key Pool** tab in Settings to add, delete, and reset keys without SQL.
- **Prompt Version History**: Rollback UI for `prompt_templates` to restore previous versions directly from the Asset Library.

### 🟡 Medium Priority
- **Dry Run / Preview Mode**: Test-run a single task with mock data to view the rendered prompt and AI results instantly.
- **Webhook Notifications**: Invoke custom webhooks when a batch is `completed` or `failed`.

### 🟢 Low Priority
- **Multi-Model Support**: Support for OpenAI, Claude, and Llama via an abstraction layer.
- **Component Marketplace**: Share Custom View Components publicly for others to import.

---

## 🏷️ Feature Unlock Matrix

| Feature | Anonymous (Guest) | Free (Registered) | Premium (Subscriber) |
| :--- | :---: | :---: | :---: |
| **Visual Designer** | ✅ | ✅ | ✅ |
| **Batch Execution (local web worker)** | ✅ | ✅ | ✅ |
| **Custom TSX Sandbox** | ✅ | ✅ | ✅ |
| **Export CSV/JSON** | ✅ | ✅ | ✅ |
| **Cost Calculator** | ✅ | ✅ | ✅ |
| **Cloud sync (Storage)** | ❌ | ✅ (Limited) | ✅ Unlimited |
| **Persistent History across devices** | ❌ | ✅ Limited | ✅ |
| **Background Processing (Cloud)** | ❌ | ❌ | ✅ |
| **Team Workspace & Collaboration** | ❌ | ❌ | ✅ |
| **Auto API Key Rotation** | ❌ | ❌ | ✅ |
| **Custom Server Environment** | ❌ | ❌ | ✅ (n8n background) |

---

## ✅ Recent Successes
- [x] **Visual Designer (ReactFlow)**
- [x] **Custom TSX Sandbox**
- [x] **Authentication & RLS**
- [x] **Asset Library (Prompts & Components)**
- [x] **Cost Calculator**

*Last Updated: 2026-02-25*
