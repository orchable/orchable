# Change: Upgrade Browser API Key Rotation Mechanism

## Why
The current browser-side Gemini API key rotation system uses a simple round-robin approach and does not keep track of key health, rate limit quotas, or temporary blocking. By upgrading the mechanism to align with the logic found in the `[Base] API Key Rotation Manager` n8n workflow, the execution engine can intelligently select healthy keys, track quota exhaustion in real-time by parsing HTTP headers, and correctly block or degrade keys based on precise API error codes, ensuring higher reliability and avoiding unnecessary quota limit errors.

## What Changes
- Add internal state tracking for API keys (`health`, `remaining_requests`, `remaining_tokens`, `blocked_until`, `consecutive_failures`) within the execution context.
- Implement HTTP response header parsing in `callGemini` to monitor `x-ratelimit-remaining-requests` and `x-ratelimit-remaining-tokens`.
- Implement rigorous error classification logic (429 Rate Limit Blocks for 15m/12h, 403 Auth Blocks for 24h, 401 Auth Disables, 500/503 Transient Degradation).
- Enhance the key selection algorithm to prioritize keys based on 1) Health, 2) Remaining Token Quota, and 3) Least-Recently-Used (LRU).

## Impact
- Specs: `orchestrator`
- Code: `src/workers/taskExecutor.worker.ts`, `src/services/keyPoolService.ts`
