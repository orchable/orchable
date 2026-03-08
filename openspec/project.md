# Orchable Project

## Architecture Rules
1. **Dual-Tier Storage Architecture**:
    - **Free Users**: By default, relational and configuration data (tasks, keys, settings) MUST be saved to client-side storage (`IndexedDB`). However, for synchronization of core reusable assets (Prompt Templates, Custom Components, AI Model Settings), Registered Free users SHALL sync to Supabase, while Documents remain strictly local.
    - **Premium Users**: All data, including Documents, MUST be saved to the remote Supabase database and File Storage.

Please respect this rule when writing services and components. For example, `keyPoolService` and `ApiKeyManager` must check the `tier` and choose `localStorage` or `Supabase` accordingly.
