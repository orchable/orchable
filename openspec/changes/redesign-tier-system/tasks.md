## 1. Database Schema
- [ ] 1.1 Create `user_usage` table with `(user_id, month)` unique constraint
- [ ] 1.2 Create `increment_user_usage()` RPC function
- [ ] 1.3 Create `get_user_usage()` RPC function
- [ ] 1.4 Add `pool_type` column to `user_api_keys` (`'personal' | 'free_pool' | 'premium_pool'`)
- [ ] 1.5 Add RLS policies for `user_usage` (users can only read their own)

## 2. Core Type Changes
- [ ] 2.1 Update `UserTier` in `src/lib/storage/index.ts` → `'free' | 'premium'`
- [ ] 2.2 Update `getStorageAdapter()` → all authenticated users use `SupabaseAdapter`
- [ ] 2.3 Remove `IndexedDBAdapter` from production code path (keep for offline cache only)

## 3. Context & Service Updates
- [ ] 3.1 Rewrite `TierContext.tsx`: remove `anonymous` handling, add premium detection logic
- [ ] 3.2 Rewrite `usageService.ts`: replace IndexedDB with Supabase RPC calls
- [ ] 3.3 Update `TierGate.tsx`: simplify priority map to `{ free: 0, premium: 1 }`
- [ ] 3.4 Create `keyPoolService.ts`: routes key requests to personal key or pool webhook

## 4. UI Changes
- [ ] 4.1 Update `Launcher.tsx`: remove `isLite` branching, use unified execution path
- [ ] 4.2 Add API Key Management section to Settings page (add/remove personal keys)
- [ ] 4.3 Add Usage Dashboard widget (current month usage vs. limit)
- [ ] 4.4 Update landing page CTA: "Try Now" → "Sign Up Free"
- [ ] 4.5 Update `TierGate` upgrade prompts to reflect new tier names

## 5. Key Pool Configuration
- [ ] 5.1 Tag existing platform keys with `pool_type = 'free_pool'` or `'premium_pool'`
- [ ] 5.2 Update Rotation Manager webhook to accept `pool_type` filter parameter
- [ ] 5.3 Document key pool operational procedures

## 6. Verification
- [ ] 6.1 Test Free user flow: login → execute → usage increments → hit limit → blocked
- [ ] 6.2 Test Premium user flow: login → execute → no limit
- [ ] 6.3 Test BYOK flow: add personal key → executions use personal key → pool not consumed
- [ ] 6.4 Test migration: existing anonymous data migrates on first login
- [ ] 6.5 Build verification: `pnpm build` passes
