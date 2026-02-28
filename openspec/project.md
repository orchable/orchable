# Orchable Project

## Architecture Rules
1. **Dual-Tier Storage Architecture**:
   - **Free Users**: All relational and configuration data MUST be saved to client-side storage (specifically `IndexedDB` via `IndexedDBAdapter` or Dexie directly, for both tasks and API keys/settings). `localStorage` should be avoided for security and size limit reasons.
   - **Premium Users**: All data MUST be saved to the remote Supabase database.

Please respect this rule when writing services and components. For example, `keyPoolService` and `ApiKeyManager` must check the `tier` and choose `localStorage` or `Supabase` accordingly.
