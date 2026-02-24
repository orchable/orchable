// === HEALTH CHECK LOGIC v2.0 – PARSE RATE LIMIT HEADERS ===

function getVietnamTime(date) {
    const d = date || new Date();
    const vietnamTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
    const year = vietnamTime.getUTCFullYear();
    const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vietnamTime.getUTCDate()).padStart(2, '0');
    const hours = String(vietnamTime.getUTCHours()).padStart(2, '0');
    const minutes = String(vietnamTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(vietnamTime.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const keyData = $('Get Fail Keys').item.json;
const checkResult = $('Check Gemini').item.json;   // full response

const now = getVietnamTime();

let result = {
    key_id: keyData.key_id,
    last_checked_at: now,
    last_quota_check_at: now
};

// ============================================================
// PARSE HEADERS + BODY (mới)
// ============================================================
const headers = checkResult.headers || checkResult.response?.headers || {};
const body = checkResult.body || checkResult || {};

const httpStatus = checkResult.statusCode || checkResult.status || 0;

// === PARSE RATE LIMIT HEADERS ===
const rl = {
    remaining_requests: parseInt(headers['x-ratelimit-remaining-requests'] || headers['X-RateLimit-Remaining'] || 0),
    remaining_tokens: parseInt(headers['x-ratelimit-remaining-tokens'] || 0),
    reset_requests: headers['x-ratelimit-reset-requests'] || '',
    reset_tokens: headers['x-ratelimit-reset-tokens'] || '',
    retry_after: parseInt(headers['retry-after'] || 0)
};

result.remaining_requests = rl.remaining_requests;
result.remaining_tokens = rl.remaining_tokens;
result.quota_reset_requests_at = rl.reset_requests;
result.quota_reset_tokens_at = rl.reset_tokens;
result.retry_after = rl.retry_after;

// ============================================================
// STEP 2: Classify error type and determine response
// ============================================================
// ERROR CLASSIFICATION TABLE (from Gemini API docs):
// ┌──────────┬──────────────────────────┬───────────────┬──────────────────────────┐
// │ HTTP     │ gRPC Status              │ Key's Fault?  │ Response                 │
// ├──────────┼──────────────────────────┼───────────────┼──────────────────────────┤
// │ 200      │ OK                       │ -             │ ✅ Healthy               │
// │ 400      │ INVALID_ARGUMENT         │ ❌ No         │ 🟡 Degraded (transient)  │
// │ 403      │ PERMISSION_DENIED        │ ✅ Yes        │ 🔴 Block 24h            │
// │ 404      │ NOT_FOUND                │ ❌ No         │ 🟡 Ignore (model issue)  │
// │ 429      │ RESOURCE_EXHAUSTED       │ ✅ Yes        │ 🔴 Block (timed)         │
// │ 500      │ INTERNAL                 │ ❌ No         │ 🟡 Degraded (transient)  │
// │ 503      │ UNAVAILABLE              │ ❌ No         │ 🟡 Degraded (transient)  │
// └──────────┴──────────────────────────┴───────────────┴──────────────────────────┘

// Extract gRPC status if available
const grpcStatus = body?.error?.status || '';

// Extract error message
let errorMessage = '';
if (checkResult?.error) {
    const err = checkResult.error;
    errorMessage = err.message || err.error?.message || (typeof err === 'string' ? err : JSON.stringify(err).substring(0, 300));
} else if (body?.error) {
    const err = body.error;
    errorMessage = err.message || JSON.stringify(err).substring(0, 300);
}

const hasModels = body?.models && Array.isArray(body.models) && body.models.length > 0;

let errorType = 'UNKNOWN';
let action = 'degraded';    // Default: mark as degraded
let blockMinutes = 0;
let isKeyFault = false;     // Whether the error is caused by the key itself

// ---- Check for Rate Limit / Quota (429 RESOURCE_EXHAUSTED) ----
const isRateLimit = httpStatus === 429 ||
    grpcStatus === 'RESOURCE_EXHAUSTED' ||
    errorMessage.toLowerCase().includes('resource exhausted') ||
    errorMessage.toLowerCase().includes('rate limit') ||
    errorMessage.toLowerCase().includes('quota exceeded') ||
    errorMessage.toLowerCase().includes('spacing your requests') ||
    errorMessage.toLowerCase().includes('too many requests');

if (httpStatus === 200 && hasModels) {
    // ✅ KEY IS HEALTHY
    action = 'healthy';
    console.log(`✅ ${keyData.key_id}: HEALTHY`);

} else if (isRateLimit) {
    // 🔴 429 RESOURCE_EXHAUSTED — Most dangerous error
    errorType = 'RATE_LIMIT_429';
    action = 'block';
    isKeyFault = true;

    // Determine block duration based on error message
    if (errorMessage.toLowerCase().includes('per day') || errorMessage.toLowerCase().includes('daily')) {
        blockMinutes = 720; // 12 hours max
        console.log(`🔴 ${keyData.key_id}: DAILY QUOTA EXHAUSTED → block 12h`);
    } else {
        blockMinutes = 15; // 15 minutes
        console.log(`🔴 ${keyData.key_id}: RATE LIMITED (RPM/TPM) → block 15min`);
    }

} else if (httpStatus === 403 || grpcStatus === 'PERMISSION_DENIED') {
    // 🔴 403 PERMISSION_DENIED
    errorType = 'PERMISSION_DENIED_403';
    action = 'block';
    isKeyFault = true;
    blockMinutes = 1440; // 24 hours
    console.log(`🚫 ${keyData.key_id}: PERMISSION DENIED → block 24h`);

} else if (httpStatus === 401 || grpcStatus === 'UNAUTHENTICATED') {
    // 🔴 401 UNAUTHENTICATED
    errorType = 'UNAUTHENTICATED_401';
    action = 'disable';
    isKeyFault = true;
    console.log(`❌ ${keyData.key_id}: INVALID/EXPIRED KEY → disabled`);

} else if (httpStatus === 404 || grpcStatus === 'NOT_FOUND') {
    // 🟢 404 NOT_FOUND — Not key issue
    errorType = 'NOT_FOUND_404';
    action = 'ignore';
    console.log(`ℹ️ ${keyData.key_id}: Model not found (not key issue)`);

} else if (httpStatus === 400 || grpcStatus === 'INVALID_ARGUMENT' || grpcStatus === 'FAILED_PRECONDITION') {
    // 🟡 400 INVALID_ARGUMENT
    errorType = 'BAD_REQUEST_400';

    if (errorMessage.toLowerCase().includes('billing') || errorMessage.toLowerCase().includes('free tier') || errorMessage.toLowerCase().includes('not available')) {
        action = 'block';
        isKeyFault = true;
        blockMinutes = 1440;
        console.log(`🔴 ${keyData.key_id}: BILLING/REGION ISSUE → block 24h`);
    } else {
        action = 'ignore';
        console.log(`ℹ️ ${keyData.key_id}: BAD REQUEST (not key issue)`);
    }

} else if (httpStatus === 500 || grpcStatus === 'INTERNAL') {
    // 🟡 500 INTERNAL
    errorType = 'SERVER_ERROR_500';
    action = 'degraded';
    console.log(`🟡 ${keyData.key_id}: SERVER ERROR 500 (transient, not key fault)`);

} else if (httpStatus === 503 || grpcStatus === 'UNAVAILABLE') {
    // 🟡 503 UNAVAILABLE
    errorType = 'UNAVAILABLE_503';
    action = 'degraded';
    console.log(`🟡 ${keyData.key_id}: SERVICE UNAVAILABLE 503 (transient, not key fault)`);

} else if (httpStatus === 0 || !httpStatus) {
    // Network error
    errorType = 'NETWORK_ERROR';
    action = 'degraded';
    console.log(`🟡 ${keyData.key_id}: NETWORK ERROR (couldn't reach API)`);

} else {
    // Unknown error code
    errorType = `UNKNOWN_${httpStatus}`;
    action = 'degraded';
    console.log(`❓ ${keyData.key_id}: UNKNOWN ERROR (HTTP ${httpStatus})`);
}

// ============================================================
// STEP 3: Apply action to key state
// ============================================================\nconst currentConsecutiveFailures = parseInt(keyData.consecutive_failures || 0);
const currentHealthCheckFailures = parseInt(keyData.health_check_failures || 0);

if (action === 'healthy') {
    result.health_status = 'healthy';
    result.last_success_at = now;
    result.health_check_failures = 0;
    result.consecutive_failures = 0;
    result.is_active = true;
    result.error_code = '';
    result.blocked_until = '';

} else if (action === 'block') {
    const blockedUntilDate = new Date(new Date().getTime() + blockMinutes * 60 * 1000);
    result.health_status = errorType.includes('RATE_LIMIT') ? 'rate_limited' : 'blocked';
    result.is_active = false;
    result.consecutive_failures = currentConsecutiveFailures + 1;
    result.health_check_failures = currentHealthCheckFailures + 1;
    result.last_failure_at = now;
    result.error_code = `${errorType}: ${errorMessage.substring(0, 200)}`;
    result.blocked_until = getVietnamTime(blockedUntilDate);
    console.log(`   → blocked_until: ${result.blocked_until}`);

} else if (action === 'disable') {
    result.health_status = 'disabled';
    result.is_active = false;
    result.consecutive_failures = currentConsecutiveFailures + 1;
    result.health_check_failures = currentHealthCheckFailures + 1;
    result.last_failure_at = now;
    result.error_code = `${errorType}: ${errorMessage.substring(0, 200)}`;
    result.blocked_until = '';

} else if (action === 'ignore') {
    result.health_status = keyData.health_status || 'healthy';
    result.is_active = keyData.is_active;
    result.consecutive_failures = currentConsecutiveFailures;
    result.health_check_failures = currentHealthCheckFailures;
    result.error_code = `${errorType}: ${errorMessage.substring(0, 200)}`;
    result.blocked_until = keyData.blocked_until || '';

} else {
    // action === 'degraded'
    const MAX_DEGRADED_FAILURES = 5;
    result.consecutive_failures = currentConsecutiveFailures + 1;
    result.health_check_failures = currentHealthCheckFailures + 1;
    result.last_failure_at = now;
    result.error_code = `${errorType}: ${errorMessage.substring(0, 200)}`;

    if (result.consecutive_failures >= MAX_DEGRADED_FAILURES) {
        result.is_active = false;
        result.health_status = 'degraded_disabled';
        result.blocked_until = '';
        console.log(`🔴 ${keyData.key_id}: ${result.consecutive_failures} transient errors → disabled`);
    } else {
        result.is_active = keyData.is_active !== undefined ? keyData.is_active : true;
        result.health_status = 'degraded';
        result.blocked_until = keyData.blocked_until || '';
        console.log(`🟡 ${keyData.key_id}: ${result.consecutive_failures}/${MAX_DEGRADED_FAILURES} transient errors`);
    }
}

// Bổ sung quota từ header cho healthy/degraded status
if (action === 'healthy' || action === 'degraded') {
    if (result.health_status === 'healthy' || result.health_status === 'degraded') {
        // (Quota fields đã được thêm vào result object ở đầu script)
    }
}

return { json: result };
