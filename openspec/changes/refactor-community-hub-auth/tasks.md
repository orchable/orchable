## 1. Hub Service Upgrades
- [ ] 1.1 In `hubService.publishAsset`, replace direct Supabase `select` with `getAssetStorageAdapter().getAsset()` or equivalent fetch to support publishing local assets.
- [ ] 1.2 In `hubService.importAsset`, accept a `tier` parameter. Use `getAssetStorageAdapter(tier)` instead of `storage.adapter` to ensure imported resources land in IndexedDB for unauthenticated users.
- [ ] 1.3 In `hubService.publishAsset` and `toggleStar`, ensure aggressive early returns or clear error messages if `user` is null (since `hub_assets` and `hub_stars` require a valid foreign key to `auth.users`).

## 2. UI Hookups
- [ ] 2.1 Update `AssetDetail.tsx` (and any other files calling `importAsset`) to pass the current user's `tier` or auth state to `importAsset`.
- [ ] 2.2 Disable "Publish" buttons across the application (e.g. `AssetLibrary`, `Designer`) if the user is entirely unauthenticated.
