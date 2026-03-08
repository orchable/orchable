# Change: Unify Pricing and Quotas

## Why

There are discrepancies between the UI, documentation, and source code regarding user tier task limits. This change will establish a single source of truth: Registered users get 100 free cloud tasks, while Anonymous users get 0 cloud tasks (local only).

## What Changes

- [MODIFY] `src/services/usageService.ts`: Set 'free' tier limit to 100.
- [MODIFY] `src/components/landing/PricingSection.tsx`: Update UI to show 100 tasks for Registered and 0 for Anonymous.
- [MODIFY] `doc/13_Tier_Features.md`: Align documentation with the new quotas and tier names.

## Impact

- Specs: `landing`, `auth`
- Code: `src/services/usageService.ts`, `src/components/landing/PricingSection.tsx`
