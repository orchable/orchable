# Change: Refactor Community Hub Auth & Storage Routing

## Why
Currently, the `hubService` methods (`publishAsset` and `importAsset`) are tightly bound to Supabase directly, or rely on the generic `storage.adapter` without considering the newly implemented tiered storage architecture. This causes critical logic gaps:
1. `publishAsset` attempts to fetch the source asset from Supabase directly (`select * from [tableName]`). However, if an Unauthenticated User tries to publish an asset they created locally in `IndexedDB`, it will fail because the asset does not exist in the Cloud database.
2. `importAsset` uses `storage.adapter` directly. If the UI hasn't explicitly set the adapter or if an Unauthenticated User imports an asset, the imported templates and components might accidentally bypass the tiered storage abstraction and misroute. The API needs to use `getAssetStorageAdapter(tier)` to route the writes correctly depending on who is clicking "Import".

## What Changes
- **MODIFIED**: `hubService.publishAsset` MUST use `getAssetStorageAdapter()` to fetch the source asset bundle before pushing it to `hub_assets`. This ensures both local (IndexedDB) and cloud (Supabase) assets can be packaged for publishing to the Hub.
- **MODIFIED**: `hubService.importAsset` MUST accept a tier context or use `getAssetStorageAdapter()` to properly write the downloaded components and templates into the user's appropriate storage tier (IndexedDB for Unauth, Supabase for Auth).
- **ADDED**: Auth gates on `hubService.ts` to explicitly block Unauthenticated users from creating Hub Assets or Starring assets, as `creator_id` and `user_id` are required fields in the remote `hub_assets` and `hub_stars` tables.

## Impact
- Specs: `community-hub`
- Code: 
  - `src/services/hubService.ts`
  - `src/pages/hub/AssetDetail.tsx` (Passing tier to import)
