# Standardize Asset Storage Tasks

## 1. Storage Adapter routing for Assets

- [x] 1.1 Create `getAssetStorageAdapter` in `src/lib/storage/index.ts` to explicitly separate execution routing from Asset storage routing. It should return `SupabaseAdapter` if user is authenticated (Premium or Free), else `IndexedDBAdapter` (for Templates, Components, Settings).
- [x] 1.2 Update `stageService.ts` methods to conditionally use `getAssetStorageAdapter()` instead of the global `storage.adapter` when fetching/saving Prompt Templates and Custom Components.

## 2. AI Settings Synchronization

- [x] 2.1 Update `AssetLibrary.tsx` fetch logic for AI Settings. Unauth uses IndexedDB. Auth (Registered & Premium) uses Supabase. Remove the local override merge for Registered Free users; they should use Supabase directly.
- [x] 2.2 Update `handleSaveAiSetting` in `AssetLibrary.tsx` to save to Supabase if authenticated, regardless of tier.

## 3. Custom Components and Prompt Templates inside AssetLibrary

- [x] 3.1 Update `fetchAssets` to use `getAssetStorageAdapter()` when fetching templates. `getCustomComponents` already wrapped in `stageService`, so fixing `stageService` fixes it here.
- [x] 3.2 Ensure `handleDeleteTemplate`, `handleSavePrompt`, `handleDeleteComponent`, `handleSaveComponent` use the new asset storage adapter logic.

## 4. Document Assets Routing

- [x] 4.1 Fix `AssetLibrary.tsx` `fetchAssets` to NOT hardcode `supabase.from('document_assets').select('*')`. Instead, it should query Supabase if Premium, or IndexedDB if Free/Unauth. Free user and unauthenticated user documents must be strictly Local.
- [x] 4.2 Update `UploadDocumentModal.tsx` to ensure Document storage rules: Premium -> Supabase. Registered Free -> IndexedDB. Unauth -> IndexedDB.
- [x] 4.3 Update `DocumentLibrary.tsx` to handle deletion correctly from correct storage adapter instead of hardcoding Supabase DB.
- [x] 4.4 Make sure all asset insertions implicitly or explicitly attach the `user_id`.
