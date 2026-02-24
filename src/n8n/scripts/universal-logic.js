// === UNIVERSAL API KEY ROTATOR v2.0 – FULL RATE LIMIT HEADERS ===
// Tích hợp proactive quota tracking + improved sorting

// ============================================================
// VIETNAM TIMEZONE HELPERS
// ============================================================
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

function parseDate(dateStr) {
    if (!dateStr || dateStr === '' || dateStr === 'Empty' || dateStr === 'Null') return null;
    const isoStr = dateStr.replace(' ', 'T') + '+07:00';
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? null : d;
}

// ============================================================
// ERROR CLASSIFICATION
// Maps error_code strings from callers to proper handling strategy
// ============================================================
const ERROR_STRATEGIES = {
    // === 429: RESOURCE_EXHAUSTED — Most dangerous ===
    'RATE_LIMIT': { type: 'rate_limit', blockMinutes: 15, shouldBlock: true },
    'RESOURCE_EXHAUSTED': { type: 'rate_limit', blockMinutes: 15, shouldBlock: true },
    'QUOTA_EXCEEDED': { type: 'rate_limit', blockMinutes: 60, shouldBlock: true },
    '429': { type: 'rate_limit', blockMinutes: 15, shouldBlock: true },

    // === 403: PERMISSION_DENIED — Key issue, long block ===
    'PERMISSION_DENIED': { type: 'auth', blockMinutes: 1440, shouldBlock: true },
    'FORBIDDEN': { type: 'auth', blockMinutes: 1440, shouldBlock: true },
    '403': { type: 'auth', blockMinutes: 1440, shouldBlock: true },

    // === 401: Invalid key — Very long block ===
    'INVALID_KEY': { type: 'auth', blockMinutes: 10080, shouldBlock: true },
    'UNAUTHENTICATED': { type: 'auth', blockMinutes: 10080, shouldBlock: true },
    '401': { type: 'auth', blockMinutes: 10080, shouldBlock: true },

    // === 400: Bad request — Not key's fault, transient ===
    'INVALID_ARGUMENT': { type: 'bad_request', blockMinutes: 0, shouldBlock: false },
    'BAD_REQUEST': { type: 'bad_request', blockMinutes: 0, shouldBlock: false },
    '400': { type: 'bad_request', blockMinutes: 0, shouldBlock: false },

    // === 404: Not found — Not key's fault ===
    'NOT_FOUND': { type: 'not_found', blockMinutes: 0, shouldBlock: false },
    '404': { type: 'not_found', blockMinutes: 0, shouldBlock: false },

    // === 500/503: Server errors — Transient, retry ===
    'INTERNAL': { type: 'server', blockMinutes: 0, shouldBlock: false },
    'SERVER_ERROR': { type: 'server', blockMinutes: 0, shouldBlock: false },
    '500': { type: 'server', blockMinutes: 0, shouldBlock: false },
    'UNAVAILABLE': { type: 'server', blockMinutes: 0, shouldBlock: false },
    'SERVICE_UNAVAILABLE': { type: 'server', blockMinutes: 0, shouldBlock: false },
    '503': { type: 'server', blockMinutes: 0, shouldBlock: false },

    // === Safety filter — Not key's fault ===
    'SAFETY': { type: 'safety', blockMinutes: 0, shouldBlock: false },
    'RECITATION': { type: 'safety', blockMinutes: 0, shouldBlock: false },
};

function classifyError(errorCode) {
    if (!errorCode) return null;
    const upper = errorCode.toUpperCase();

    // Check for exact match first
    for (const [key, strategy] of Object.entries(ERROR_STRATEGIES)) {
        if (upper.includes(key.toUpperCase())) return strategy;
    }

    // Check for HTTP status code pattern: "[429] ..." or "429:"
    const statusMatch = upper.match(/\[?(\d{3})\]?/);
    if (statusMatch) {
        const code = statusMatch[1];
        if (ERROR_STRATEGIES[code]) return ERROR_STRATEGIES[code];
    }

    return null; // Unknown error
}

// ============================================================
// QUOTA CONFIGS (New)
// ============================================================
const config = $("CONFIGS").first().json;
const LOW_REQUESTS_THRESHOLD = parseInt(config.LOW_REQUESTS_THRESHOLD || '100', 10);
const LOW_TOKENS_THRESHOLD = parseInt(config.LOW_TOKENS_THRESHOLD || '50000', 10);
const COOLDOWN_MINUTES = parseInt(config.COOLDOWN_MINUTES || '5', 10);
const MAX_CONSECUTIVE_FAILS = parseInt(config.MAX_CONSECUTIVE_FAILS || '3', 10);
const BLOCK_DURATION_HOURS = parseInt(config.BLOCK_DURATION_HOURS || '2', 10);

// ============================================================
// MAIN LOGIC
// ============================================================
const keyItems = $('Get Keys').all();
const now = new Date();

let triggerData = null;
try {
    const setNode = $('Webhook Set Key State');
    if (setNode && setNode.first() && setNode.first().json.body) {
        triggerData = setNode.first().json.body;
    }
} catch (e) { }

if (triggerData) {
    // ====================== SET KEY STATE (với rate_limit) ======================
    const { key_id, status, error_code, rate_limit } = triggerData;

    const keyItem = keyItems.find(i => i.json.key_id === key_id);
    if (!keyItem) throw new Error(`Key ${key_id} not found`);

    const key = { ...keyItem.json };
    const currentTime = getVietnamTime();
    key.last_used_at = currentTime;
    key.last_quota_check_at = currentTime;

    if (status === 'success') {
        key.last_success_at = currentTime;
        key.consecutive_failures = 0;
        key.blocked_until = '';
        key.error_code = '';
        key.health_status = 'healthy';
        key.is_active = true;

        // === TÍCH HỢP RATE LIMIT HEADERS ===
        if (rate_limit && typeof rate_limit === 'object') {
            key.remaining_requests = parseInt(rate_limit.remaining_requests || 0);
            key.remaining_tokens = parseInt(rate_limit.remaining_tokens || 0);
            key.quota_reset_requests_at = rate_limit.reset_requests || '';
            key.quota_reset_tokens_at = rate_limit.reset_tokens || '';
            key.retry_after = parseInt(rate_limit.retry_after || 0);

            // Nếu quota rất thấp → tự động mark low
            if (key.remaining_requests < LOW_REQUESTS_THRESHOLD || key.remaining_tokens < LOW_TOKENS_THRESHOLD) {
                key.health_status = 'rate_limited';
                const blockUntil = new Date(now.getTime() + 10 * 60 * 1000); // block nhẹ 10 phút
                key.blocked_until = getVietnamTime(blockUntil);
                key.is_active = false;
            }
        }
    } else if (status === 'fail') {
        key.last_failure_at = currentTime;
        key.error_code = error_code || 'UNKNOWN';

        // Classify the error to determine response strategy
        const strategy = classifyError(error_code);

        // Cập nhật quota nếu có trong fail response
        if (rate_limit) {
            key.remaining_requests = parseInt(rate_limit.remaining_requests || 0);
            key.remaining_tokens = parseInt(rate_limit.remaining_tokens || 0);
            // ... các trường quota khác nếu cần
        }

        if (strategy && strategy.shouldBlock) {
            // === IMMEDIATE BLOCK (429, 403, 401) ===
            const blockUntil = new Date(now.getTime() + strategy.blockMinutes * 60 * 1000);
            key.blocked_until = getVietnamTime(blockUntil);
            key.is_active = false;
            key.consecutive_failures = (parseInt(key.consecutive_failures) || 0) + 1;

            if (strategy.type === 'rate_limit') {
                key.health_status = 'rate_limited';
            } else {
                key.health_status = 'blocked';
            }

            console.log(`🔴 ${key_id}: ${strategy.type.toUpperCase()} → blocked ${strategy.blockMinutes}min until ${key.blocked_until}`);

        } else if (strategy && (strategy.type === 'server' || strategy.type === 'bad_request' || strategy.type === 'not_found' || strategy.type === 'safety')) {
            // === NOT KEY'S FAULT — don't punish the key ===
            key.health_status = 'degraded';
            console.log(`🟡 ${key_id}: ${strategy.type.toUpperCase()} → not key's fault, keeping active`);

        } else {
            // === UNKNOWN ERROR — use counter-based approach ===
            key.consecutive_failures = (parseInt(key.consecutive_failures) || 0) + 1;

            if (key.consecutive_failures >= MAX_CONSECUTIVE_FAILS) {
                const blockUntil = new Date(now.getTime() + BLOCK_DURATION_HOURS * 60 * 60 * 1000);
                key.blocked_until = getVietnamTime(blockUntil);
                key.is_active = false;
                key.health_status = 'blocked';
                console.log(`🔴 ${key_id}: UNKNOWN error × ${key.consecutive_failures} → blocked`);
            } else {
                key.health_status = 'degraded';
                console.log(`🟡 ${key_id}: UNKNOWN error × ${key.consecutive_failures}/${MAX_CONSECUTIVE_FAILS}`);
            }
        }
    }

    return { json: key };

} else {
    // ====================== GET ACTIVE KEY (với quota filter + sorting) ======================
    const allKeys = keyItems.map(item => ({ ...item.json }));

    const candidates = allKeys.filter(key => {
        if (!key.is_active) return false;
        if (!key.api_key || key.api_key.trim() === '') return false;

        const blockedUntil = parseDate(key.blocked_until);
        if (blockedUntil && blockedUntil > now) return false;

        if ((parseInt(key.consecutive_failures) || 0) >= MAX_CONSECUTIVE_FAILS) return false;

        // === PROACTIVE QUOTA FILTER ===
        const reqLeft = parseInt(key.remaining_requests) || 999999;
        const tokLeft = parseInt(key.remaining_tokens) || 999999999;
        if (reqLeft < LOW_REQUESTS_THRESHOLD || tokLeft < LOW_TOKENS_THRESHOLD) return false;

        // cooldown logic giữ nguyên...
        if (key.last_used_at && key.health_status !== 'degraded') {
            const lastUsed = parseDate(key.last_used_at);
            if (lastUsed) {
                const minutesAgo = (now - lastUsed) / 1000 / 60;
                if (minutesAgo < COOLDOWN_MINUTES) return false;
            }
        }
        return true;
    });

    if (candidates.length === 0) {
        throw new Error('No healthy API keys available (all blocked or quota low).');
    }

    // === SORTING MỚI: Ưu tiên quota cao nhất ===
    candidates.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;

        // Health
        const healthPriority = { 'healthy': 0, 'recovered': 1, 'degraded': 2, 'rate_limited': 3 };
        const aH = healthPriority[a.health_status] || 4;
        const bH = healthPriority[b.health_status] || 4;
        if (aH !== bH) return aH - bH;

        // QUOTA – cao nhất ưu tiên
        const aTok = parseInt(a.remaining_tokens) || 0;
        const bTok = parseInt(b.remaining_tokens) || 0;
        if (aTok !== bTok) return bTok - aTok;   // cao → thấp

        // Never used / LRU giữ nguyên...
        const aNever = !a.last_used_at;
        const bNever = !b.last_used_at;
        if (aNever && !bNever) return -1;
        if (!aNever && bNever) return 1;

        const aTime = a.last_used_at ? (parseDate(a.last_used_at)?.getTime() || 0) : 0;
        const bTime = b.last_used_at ? (parseDate(b.last_used_at)?.getTime() || 0) : 0;
        return aTime - bTime;
    });

    const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    const result = { ...selected };
    result.last_used_at = getVietnamTime();
    result.health_status = result.health_status || 'healthy';

    return { json: result };
}
