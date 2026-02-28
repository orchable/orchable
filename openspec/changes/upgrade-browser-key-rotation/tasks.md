## 1. Implementation
- [x] 1.1 Create `KeyManager` class within `src/workers/taskExecutor.worker.ts` or `src/services/keyPoolService.ts` to track key states (health, quota, blocked_until, failures).
- [x] 1.2 Update `taskExecutor` to initialize the `KeyManager` with available keys from `currentConfigs`.
- [x] 1.3 Refactor the internal `callGemini` function iteration to ask `KeyManager` for the best available key (sorted by health, remaining tokens, LRU).
- [x] 1.4 Update `callGemini` execution to parse response headers: `x-ratelimit-remaining-requests`, `x-ratelimit-remaining-tokens`, `x-ratelimit-reset-requests`, etc.
- [x] 1.5 Implement error classification logic for `callGemini` failures (e.g. 429 -> Block 15m, 403 -> Block 24h, 401 -> Disable, 500/503 -> Degrade).
- [x] 1.6 Update the Key's state in `KeyManager` based on the success/failure and newly parsed header quota.
- [ ] 1.7 Expose or export key state updates to `RunExecutionDialog.tsx` if additional UI insights on quota are required (optional, stretch goal).
