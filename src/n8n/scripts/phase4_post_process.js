// ========== PHASE 4: POST-PROCESS ==========
// Merged from: Check Post-Process + Execute Post-Process Webhook
//              + Handle Post-Process Result

const task = $json;
const extra = task.extra || {};
const cfg = extra.post_process;

// Skip if post-process not enabled
if (!cfg?.enabled || !cfg?.webhook_url) {
  return { ...task, _post_process_skipped: true };
}

// Prepare request body based on input_source config
let requestBody;
const inputSource = cfg.input_source || 'output_only';

if (inputSource === 'output_only') {
  requestBody = task.result;
} else if (inputSource === 'input_and_output') {
  requestBody = { input: task.data, output: task.result };
} else {
  requestBody = task.result;
}

try {
  const method = cfg.webhook_method || 'POST';
  const res = await this.helpers.httpRequest({
    method,
    url: cfg.webhook_url,
    body: requestBody,
    json: true,
    timeout: 30000
  });

  return {
    ...task,
    _post_process_executed: true,
    _post_process_response: res
  };

} catch (error) {
  const onFailure = cfg.on_failure || 'continue';

  if (onFailure === 'abort') {
    throw new Error('Post-process webhook failed: ' + error.message);
  }

  // Continue with original result
  return {
    ...task,
    _post_process_failed: true,
    _post_process_error: error.message
  };
}