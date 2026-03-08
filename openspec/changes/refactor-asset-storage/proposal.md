# Change: Standardize Asset Storage

## Why
Currently, the storage of Assets (Prompt Templates, Custom Components, AI Settings, and Documents) relies on the execution path or has inconsistent tier checks. We need to standardize asset storage to ensure that all authenticated users (Free Registered and Premium) save their reusable assets to Supabase so they are synced across devices, while Documents have slightly different rules due to storage limits.

## What Changes
- **MODIFIED**: Storage logic in `AssetLibrary.tsx` and `stageService.ts` to fetch and save Assets based on authentication status rather than the execution path context.
- **MODIFIED**: `IStorageAdapter` usage for Prompt Templates, Custom Components, and AI Settings. If a user is authenticated (Premium or Registered Free), these assets MUST be saved to and fetched from Supabase, tied to `user_id`. Unauthenticated users ALWAYS use local IndexedDB.
- **MODIFIED**: Document Assets logic. Premium users save Documents to Supabase Storage and database for cloud sync. Registered (Free) users and Unauthenticated users save Documents 100% to local IndexedDB (both physical blob and database record). This ensures Free tier documents do not consume cloud storage or database rows.
- **MODIFIED**: `IndexedDBAdapter` and `SupabaseAdapter` to ensure proper `user_id` assignment. Unauthenticated uploads use 'anonymous' as `user_id`.
- **IMPLEMENTED**: `getStorageAdapterForType` helper to explicitly handle the Document storage exception for Free Authenticated users.

## Impact

- Specs: `asset-management`
- Code: 
  - `src/pages/AssetLibrary.tsx`
  - `src/services/stageService.ts`
  - `src/components/assets/UploadDocumentModal.tsx`
  - `src/components/assets/DocumentLibrary.tsx`
  - `src/lib/storage/index.ts`
  - `src/lib/storage/IndexedDBAdapter.ts`
  - `src/lib/storage/SupabaseAdapter.ts`
