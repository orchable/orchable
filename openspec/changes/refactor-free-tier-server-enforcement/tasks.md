## 1. Database Migration
- [x] 1.1 Add `tier_source` column to `ai_tasks` (VARCHAR: `free_pool`, `free_byok`, `premium_pool`, `premium_byok`)
- [x] 1.2 Add `synced_to_client` column to `ai_tasks` (BOOLEAN, default FALSE)
- [x] 1.3 Verify/create `user_usage` table schema (user_id UUID, month VARCHAR, task_count INT, PRIMARY KEY (user_id, month))
- [x] 1.4 Create `submit_free_tier_tasks` RPC function (reads permanent counter from `user_usage`, inserts tasks)
- [x] 1.5 Create `on_task_completed` trigger on `ai_tasks` — increments `user_usage.task_count` when `free_pool` task completes
- [x] 1.6 Create `get_free_tier_usage` RPC function (reads from `user_usage`, returns used/remaining/limit)
- [x] 1.7 Setup `pg_cron` job for Free Tier task data cleanup (1-day TTL, deletes rows, counter unaffected)
- [x] 1.8 Add index on `ai_tasks(user_id, tier_source, status, completed_at)` for CRON performance

## 2. Execution Router (Client)
- [ ] 2.1 Create `executionRouter.ts` — routes based on (tier + hasPersonalKeys)
- [ ] 2.2 Update `executorService.ts` to use router
- [ ] 2.3 Update `keyPoolService.ts` to expose `hasPersonalKeys()` async check
- [ ] 2.4 Update `storage/index.ts` — adapter depends on execution path, not just tier

## 3. Supabase Task Submission (Free No-Key Path)
- [ ] 3.1 Create `freeTierService.ts` — submits tasks via `submit_free_tier_tasks` RPC
- [ ] 3.2 Handle `QUOTA_EXCEEDED` response (show upgrade modal with used/remaining info)
- [ ] 3.3 Add in-app warning toast at task creation: "Results expire in 24h. Keep browser open or return within 1 day."

## 4. Sync-Back Flow (Supabase → IndexedDB)
- [ ] 4.1 Create `syncBackService.ts` — polls completed `free_pool` tasks, saves to IndexedDB, marks `synced_to_client`
- [ ] 4.2 Auto-trigger sync-back on app load (if Free no-key user)
- [ ] 4.3 Background polling every 30s while browser is open
- [ ] 4.4 Mark tasks as `synced_to_client = true` after successful download

## 5. UI Updates
- [ ] 5.1 Update `UsageDashboard` — show "X / 30 tasks" for Free (no-key), "Unlimited (BYOK)" for Free+key
- [ ] 5.2 Add quota check + warning in Launcher before running orchestration
- [ ] 5.3 Show data expiration countdown in Monitor for Free Tier tasks
- [ ] 5.4 Update Settings page — clarify Free BYOK vs Free Pool behavior

## 6. Email Notifications
- [ ] 6.1 Email on task creation: "Your orchestration is running. Results expire in 24 hours."
- [ ] 6.2 Email before cleanup (~20h mark): "Your results are about to be deleted."
- [ ] 6.3 Setup email trigger (Supabase Edge Function or n8n notification workflow)

## 7. n8n Updates (BYOK Key Resolution)
- [ ] 7.1 Update n8n workflow to check `tier_source` on claimed tasks
- [ ] 7.2 If `premium_byok` or `free_byok`, resolve user's API key from `user_api_keys`
- [ ] 7.3 If `free_pool` or `premium_pool`, use platform key pool (existing behavior)
- [ ] 7.4 Ensure n8n increments `user_usage` counter via trigger (or explicit RPC call on completion)

## 8. Verification
- [ ] 8.1 Test: Free (no-key) → 30 tasks accepted, 31st rejected
- [ ] 8.2 Test: CRON cleanup deletes task data, but 31st is STILL rejected (permanent counter)
- [ ] 8.3 Test: Free (BYOK) → unlimited local execution via Web Worker
- [ ] 8.4 Test: Premium (BYOK) → Supabase + user's key
- [ ] 8.5 Test: Sync-back flow → Supabase → IndexedDB → confirm
- [ ] 8.6 Test: Email notifications sent at creation and before cleanup
