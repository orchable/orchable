## Context
Orchable currently supports 4 tiers (`anonymous`, `free`, `premium_byok`, `premium_managed`). The anonymous tier gives unauthenticated users access to the Designer and Launcher, but they still need their own API key — defeating the purpose.

The platform owner's API keys have no usage cap mechanism for anonymous/free users, creating an abuse vector.

## Goals
- **Remove Anonymous mode**: All AI execution requires authentication.
- **Introduce FreePool/PremiumPool**: Platform-managed key pools with per-user metering.
- **Server-side usage tracking**: Prevent local tampering.
- **BYOK as optional override**: Power users can bring their own key(s).

## Non-Goals
- Billing/payment integration (Stripe) — deferred to a later phase.
- Changing the Designer or Monitor UX (they remain fully functional after login).
- Modifying the n8n backend workflow (key routing is handled by existing Rotation Manager).

## Decisions

### Decision 1: Two Tiers, Not Three
We collapse `premium_byok` and `premium_managed` into a single `premium` tier. The distinction between "managed keys" and "own keys" is handled by the Key Pool Router, not the tier itself.

### Decision 2: Key Pool Routing Architecture
```
User Request → TierContext
  ├── Has personal key(s)? → Use personal key (direct Gemini call)
  └── No personal key? → Route to Pool
        ├── Free user → FreePool webhook (shared keys, lower priority)
        └── Premium user → PremiumPool webhook (dedicated keys, higher priority)
```

The Key Pool is the existing **API Key Rotation Manager** n8n workflow, extended with a `pool_type` field (`free_pool` | `premium_pool`) on each key record.

### Decision 3: Usage Tracking in Supabase
```sql
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  month VARCHAR(7) NOT NULL,  -- '2026-02'
  task_count INT DEFAULT 0,
  token_input_count BIGINT DEFAULT 0,
  token_output_count BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month)
);
```

Incremented atomically by an RPC function for tamper-resistance:
```sql
CREATE FUNCTION increment_user_usage(
  p_user_id UUID, p_tasks INT DEFAULT 1,
  p_input_tokens BIGINT DEFAULT 0, p_output_tokens BIGINT DEFAULT 0
) RETURNS void AS $$
  INSERT INTO user_usage (user_id, month, task_count, token_input_count, token_output_count)
  VALUES (p_user_id, to_char(now(), 'YYYY-MM'), p_tasks, p_input_tokens, p_output_tokens)
  ON CONFLICT (user_id, month) DO UPDATE SET
    task_count = user_usage.task_count + p_tasks,
    token_input_count = user_usage.token_input_count + p_input_tokens,
    token_output_count = user_usage.token_output_count + p_output_tokens,
    updated_at = now();
$$ LANGUAGE sql;
```

### Decision 4: Personal Key Storage
Users manage their keys in a Settings page. Keys are stored in `user_api_keys` with `pool_type = 'personal'`.

- **Free**: UI enforces max 3 keys. Attempting to add a fourth shows an upgrade prompt.
- **Premium**: No limit on personal keys. Full rotation support.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| FreePool keys get rate-limited by heavy usage | Use 5-10 dedicated Free Tier Gemini keys; rotate aggressively; cap per-user at 200 tasks/mo |
| Users lose local-only data after migration | Run `syncService.migrateAnonymousData()` on first login; show one-time migration prompt |
| Removing anonymous mode reduces casual visitors | Landing page still showcases demos and screenshots; Sign-up is one-click via Google OAuth |

## Migration Plan
1. Add `user_usage` table and RPC.
2. Add `pool_type` column to `user_api_keys` (default: `'personal'`, also: `'free_pool'`, `'premium_pool'`).
3. Update `UserTier` type to `'free' | 'premium'`.
4. Update `TierContext.tsx` to remove anonymous handling.
5. Update `TierGate.tsx` priorities.
6. Update `usageService.ts` to use Supabase RPC instead of IndexedDB.
7. Update `Launcher.tsx` to remove `isLite` branching.
8. Add Settings page section for personal API key management.
9. Update landing page CTA.

### Decision 5: Key Encryption at Rest

Personal API keys are encrypted using Supabase Vault before storage:

```sql
-- On insert:
SELECT vault.create_secret(p_api_key, p_key_name, 'User personal Gemini key')
  INTO v_secret_id;

INSERT INTO user_api_keys (user_id, key_name, vault_secret_id, pool_type)
VALUES (p_user_id, p_key_name, v_secret_id, 'personal');

-- On read (decryption):
SELECT decrypted_secret FROM vault.decrypted_secrets
WHERE id = v_secret_id;
```

The raw `api_key_encrypted` column is replaced by `vault_secret_id UUID` referencing the Vault.

### Decision 6: Usage Limits & Grace Period

| Parameter | Value |
| --- | --- |
| Free monthly task limit | **200 tasks** |
| Grace overage | **10%** (up to 220 tasks) |
| Hard block | At **220 tasks** — all further executions rejected |
| Soft warning | At **180 tasks** (90%) — UI shows "approaching limit" banner |
| Reset | 1st of each month (UTC) |

The enforcement logic:

```typescript
function canExecute(usage: number, tier: string): { allowed: boolean; warning: boolean } {
  if (tier === 'premium') return { allowed: true, warning: false };

  const LIMIT = 200;
  const GRACE = Math.floor(LIMIT * 0.1); // 20
  const hardLimit = LIMIT + GRACE; // 220

  return {
    allowed: usage < hardLimit,
    warning: usage >= LIMIT * 0.9, // warn at 180+
  };
}
```

## Resolved Questions

All open questions have been answered:

1. ✅ **Free tier monthly limit**: **200 tasks/month** (confirmed).
2. ✅ **Key encryption**: **Yes** — using `vault.create_secret()` for at-rest encryption.
3. ✅ **Grace period**: **Yes** — 10% overage (220 hard cap), with soft warning at 180.
