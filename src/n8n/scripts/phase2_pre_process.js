// ========== PHASE 2: PRE-PROCESS ==========
// Merged from: Check Pre-Process + Execute Pre-Process Webhook
//              + Merge Pre-Process Output + Handle Pre-Process Failure

const task = $json;
const cfg = task.extra?.pre_process;

// Skip if pre-process not enabled or no URL
if (!cfg?.enabled || !cfg?.webhook_url) {
  return { ...task, _pre_process_skipped: true };
}

try {
  const method = cfg.webhook_method || 'POST';
  const res = await this.helpers.httpRequest({
    method,
    url: cfg.webhook_url,
    body: task.data,
    json: true,
    timeout: 30000
  });

  // Merge output based on output_handling config
  let mergedData = { ...task.data };
  const outputHandling = cfg.output_handling || 'merge';

  if (outputHandling === 'replace') {
    mergedData = res;
  } else if (outputHandling === 'merge') {
    mergedData = { ...mergedData, ...res };
  } else if (outputHandling === 'nested') {
    const fieldName = cfg.nested_field_name || 'pre_output';
    mergedData[fieldName] = res;
  }

  return { ...task, data: mergedData, _pre_process_executed: true };

} catch (error) {
  const onFailure = cfg.on_failure || 'continue';

  if (onFailure === 'abort') {
    throw new Error('Pre-process webhook failed: ' + error.message);
  }

  // Continue with original data
  return {
    ...task,
    _pre_process_failed: true,
    _pre_process_error: error.message
  };
}