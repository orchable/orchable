# Change: Redesign Tier System — Remove Anonymous, Add Key Pools

## Why
The current Anonymous tier creates a paradox: users can try the platform without logging in, but they still need their own Gemini API key. This makes the "frictionless" experience pointless. Additionally, there's no mechanism to cap usage when using platform-provided keys.

The new design simplifies the system to **2 authenticated tiers** (Free + Premium), each with a **platform-managed Key Pool** and optional **BYOK (Bring Your Own Key)** support.

## What Changes

### Tier Simplification
- **REMOVE** `anonymous` tier entirely (no unauthenticated access to AI features).
- **RENAME** `free` → `free` (kept, but behavior changes).
- **RENAME** `premium_byok` + `premium_managed` → unified `premium` tier.
- All users **MUST authenticate** (Google OAuth / Email) before executing pipelines.

### Key Pool System
- **FreePool**: A platform-managed pool of Gemini API keys (Free Tier quota) shared among all Free users. Metered per-user.
- **PremiumPool**: A dedicated, higher-capacity pool for Premium users. Metered per-user.
- **BYOK Override**: Any user can optionally provide their own key(s):
  - **Free**: Max **3 personal keys**. When provided, executions use these keys with rotation (bypasses FreePool quota, but personal key limits still apply via Gemini's own rate limiting).
  - **Premium**: **Unlimited personal keys** with full rotation support.

### Usage Tracking (Server-Side)
- **BREAKING**: Usage tracking moves from IndexedDB (local) to **Supabase** (server-side) for accuracy and tamper-resistance.
- New `user_usage` table tracks: `user_id`, `month`, `task_count`, `token_count`.
- Quotas enforced server-side before dispatching to Key Pool.

### Quota Limits

| Resource | Free | Premium |
|---|---|---|
| Tasks per month | 200 | Unlimited |
| Personal API keys | 3 | Unlimited |
| Key Pool access | FreePool (shared) | PremiumPool (dedicated) |
| Cloud Storage | Limited | Unlimited |
| Background Processing | ❌ | ✅ |

## Impact
- **Specs**: Affects authentication flow, execution pipeline, key management.
- **Code Files**:
  - `src/lib/storage/index.ts` (UserTier type)
  - `src/contexts/TierContext.tsx` (core logic)
  - `src/components/common/TierGate.tsx` (gate priorities)
  - `src/services/usageService.ts` (→ server-side)
  - `src/pages/Launcher.tsx` (remove `isLite` anonymous path)
  - `src/services/executorService.ts` (key pool routing)
- **Database**: New `user_usage` table, new `key_pool` enum in `user_api_keys`.
- **UX**: Login page becomes the mandatory entry point. Landing page CTA changes from "Try Now" to "Sign Up Free".
