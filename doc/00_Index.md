# 📚 Orchable — Technical Documentation

> **Orchable — Orchestrate Anything. Automatically.**
> orchable.app · orchable.xyz

Welcome to the technical documentation for **Orchable** — an AI-powered pipeline orchestration platform. Design multi-stage AI workflows visually, run batch jobs at scale, and monitor results in real time.

---

## 📖 Documentation Index

### 1. [System Architecture](./01_System_Architecture.md)
4-tier architecture overview: React Frontend, Supabase Backend, n8n Workflow Engine, and AI APIs. Includes data flow diagrams and key design decisions.

### 2. [Database Schema](./02_Database_Schema.md)
All Supabase tables: `ai_tasks`, `task_batches`, `prompt_templates`, `custom_components`, `user_api_keys`, `api_key_health`. Includes ERD and migration history.

### 3. [Workflow: Base Agent](./03_Workflows_Base_Agent.md)
Deep-dive into the Base Agent — the AI processing core. Explains all 6 phases: task intake → content generation → error handling → sub-task creation.

### 4. [Workflow: Orchestration](./04_Workflows_Orchestration.md)
How the Orchestrator works, the Global Routing Table (GRT) mechanism, and complex flow patterns (branching, parallel, merge).

### 5. [Scripts Reference](./05_Scripts_Reference.md)
Reference documentation for JavaScript files in `src/n8n/scripts`. Input/output and logic for each script node.

### 6. [API Key Management](./06_API_Key_Management.md)
The Rotation Manager mechanism — managing, rotating, and automatically disabling failed or rate-limited API keys.

### 7. [Operational Guide](./07_Operational_Guide.md)
How to run batch jobs, debug stuck workflows, and useful SQL queries for monitoring.

### 8. [Changelog](./08_Daily_Changelog.md)
All updates from 2026-02-17 to present, including major features: Asset Library, Calculator, Authentication, Monitor Enhancements.

### 9. [Feature Wishlist](./09_Wishlist.md)
Proposed features and improvements, with completed items marked and remaining priorities listed.

### 10. [Frontend Guide](./10_Frontend_Guide.md)
Detailed documentation for all pages, services, and components: Designer, Monitor, Launcher, Asset Library, Calculator, Settings.

### 11. [AI Agent: Prompt Template & Orchestration Config Authoring](./11_AI_Agent_Authoring_Guide.md)
Complete guide for AI agents to write standard-compliant Prompt Templates (`%%variable%%` syntax, section order, output schema) and create complete Orchestration Config JSON.

### 12. [AI Agent: Custom View Component Authoring](./12_AI_Agent_Component_Guide.md)
Sandbox guide for AI agents writing Custom View Components (TSX): injected globals, forbidden patterns list, and practical examples.

### 17. [Community Hub](./17_Community_Hub.md)
Complete design and implementation plan for the Orchable Hub — the community-driven asset sharing platform. Covers asset taxonomy, database schema, sharing workflows, Remix/attribution chains, UI structure, moderation model, access control matrix, monetization-ready schema, and the phased implementation roadmap.

---

*Last updated: 2026-02-25*
