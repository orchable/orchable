---
sidebar_position: 2
title: API Key Management
---

# 🔑 API Key Management (Rotation Manager)

To ensure system stability under high request volumes, we utilize a **Smart Key Rotation** mechanism.

## Workflow: `[Base] API Key Rotation Manager`

This workflow acts as a Service that provides Keys to Agents.

### Endpoints
- `POST /webhook/get-active-key`: Retrieves an available key.
- `POST /webhook/set-key-state`: Reports the outcome of usage (success/failure).

### Key Selection Logic
Upon receiving a request for a key:
1.  Filters for keys where `is_active = true`.
2.  Filters out keys currently in "cooldown".
3.  Sorts by:
    - `priority` (Higher first).
    - `usage_count` (Least used first - Load balancing).

### Error Handling & Blocking Mechanism
When an Agent reports a key failure:
1.  **Error Classification**:
    - 429 Error (Rate Limit): Temporarily blocks the key (Exponential Backoff).
    - 403 Error (Invalid Key): Permanently disables it (`is_active = false`).
    - 5xx Error: Short-term block.
2.  **DB Update**: Logs events in `api_key_health` and `api_key_usage_log`.

## Manual Management

### Adding a New Key
Insert into the `user_api_keys` table:
```sql
INSERT INTO user_api_keys (user_id, key_name, api_key_encrypted, priority)
VALUES ('<uuid>', 'Gemini Pro 01', '<key>', 1);
```

### Resetting a Blocked Key
```sql
UPDATE api_key_health SET blocked_until = NULL, consecutive_failures = 0
WHERE user_api_key_id = '<uuid>';
```

*Last Updated: 2026-02-24*
