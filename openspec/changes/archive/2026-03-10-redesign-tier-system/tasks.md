## 1. Database Schema
- [x] 1.1 Create `user_usage` table with `(user_id, month)` unique constraint
- [x] 1.2 Create `increment_user_usage()` RPC function
- [x] 1.3 Create `get_user_usage()` RPC function
- [x] 1.4 Add `pool_type` column to `user_api_keys` (`'personal' | 'free_pool' | 'premium_pool'`)
- [x] 1.5 Add RLS policies for `user_usage` (users can only read their own)

## 2. Core Type Changes
- [x] 2.1 Update `UserTier` in `src/lib/storage/index.ts` → `'free' | 'premium'`
- [x] 2.2 Update `getStorageAdapter()` → all authenticated users use `SupabaseAdapter`
- [x] 2.3 Remove `IndexedDBAdapter` from production code path (keep for offline cache only)

## 3. Context & Service Updates
- [x] 3.1 Rewrite `TierContext.tsx`: remove `anonymous` handling, add premium detection logic
- [x] 3.2 Rewrite `usageService.ts`: replace IndexedDB with Supabase RPC calls
- [x] 3.3 Update `TierGate.tsx`: simplify priority map to `{ free: 0, premium: 1 }`
- [x] 3.4 Create `keyPoolService.ts`: routes key requests to personal key or pool webhook

## 4. UI Changes
- [x] 4.1 Update `Launcher.tsx`: remove `isLite` branching, use unified execution path
- [x] 4.2 Add API Key Management section to Settings page (add/remove personal keys)
- [x] 4.3 Add Usage Dashboard widget (current month usage vs. limit)
- [x] 4.4 Update landing page CTA: "Try Now" → "Sign Up Free"
- [x] 4.5 Update `TierGate` upgrade prompts to reflect new tier names

## 5. Key Pool Configuration
- [x] 5.1 Tag existing platform keys with `pool_type = 'free_pool'` or `'premium_pool'`
- [x] 5.2 Update Rotation Manager webhook to accept `pool_type` filter parameter
- [x] 5.3 Document key pool operational procedures

## 6. Verification
- [x] 6.1 Test Free user flow: login → execute → usage increments → hit limit → blocked
- [x] 6.2 Test Premium user flow: login → execute → no limit
- [x] 6.3 Test BYOK flow: add personal key → executions use personal key → pool not consumed
- [x] 6.4 Test migration: existing anonymous data migrates on first login
- [x] 6.5 Build verification: `pnpm build` passes
