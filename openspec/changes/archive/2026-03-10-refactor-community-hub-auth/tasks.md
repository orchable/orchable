## 1. Hub Service Upgrades
- [x] 1.1 In `hubService.publishAsset`, replace direct Supabase `select` with `getAssetStorageAdapter().getAsset()` or equivalent fetch to support publishing local assets.
- [x] 1.2 In `hubService.importAsset`, accept a `tier` parameter. Use `getAssetStorageAdapter(tier)` instead of `storage.adapter` to ensure imported resources land in IndexedDB for unauthenticated users.
- [x] 1.3 In `hubService.publishAsset` and `toggleStar`, ensure aggressive early returns or clear error messages if `user` is null (since `hub_assets` and `hub_stars` require a valid foreign key to `auth.users`).

## 2. UI Hookups
- [x] 2.1 Update `AssetDetail.tsx` (and any other files calling `importAsset`) to pass the current user's `tier` or auth state to `importAsset`.
- [x] 2.2 Disable "Publish" buttons across the application (e.g. `AssetLibrary`, `Designer`) if the user is entirely unauthenticated.
