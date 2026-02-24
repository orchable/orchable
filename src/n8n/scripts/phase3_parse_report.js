console.log('--- Phase 3: Start Parsing ---');
// ========== PHASE 3: PARSE AI RESULT & REPORT KEY STATUS ==========
// Merged from: Convert MarkdownJSON to JSON + Report Success + Report Failure
//              + Retry Logic + Add AlongWith Attributes

// USE PRE-PROCESS OUTPUT as source of truth for extra/data/metadata
const taskInfo = $('2. Pre-Process').first().json;
const keyInfo = $('Get Key').first().json;
const apiRes = $json;

// Use static data to persist retry count across Wait node resumes
const staticData = $getWorkflowStaticData('global');
const retryCount = staticData.retryCount || 0;
const maxRetries = 3;

// --- 1. HANDLE API ERROR ---
if (apiRes.error || !apiRes.candidates) {
  // Report failure to key rotation manager
  try {
    const errorStatus = apiRes.error?.status || 'API_ERROR';
    const errorMessage = apiRes.error?.message || '';
    const fullErrorCode = `[${errorStatus}] ${errorMessage}`;

    await this.helpers.httpRequestWithAuthentication.call(this, 'httpBasicAuth', {
      method: 'POST',
      url: 'https://n8n.teky.vn/webhook/set-key-state',
      body: {
        key_id: keyInfo.key_id,
        status: 'fail',
        error_code: fullErrorCode
      },
      json: true
    });
  } catch (e) { /* ignore reporting error */ }

  if (retryCount < maxRetries - 1) {
    staticData.retryCount = retryCount + 1;
    return { _retry: true, _retry_count: retryCount + 1, _err: apiRes.error?.message };
  }

  // Max retries reached — reset counter and throw
  staticData.retryCount = 0;
  throw new Error('Max retries reached. All available keys failed. Last error: ' + (apiRes.error?.message || 'Unknown'));
}

// --- 2. PARSE JSON FROM AI RESPONSE ---
function convertMarkdownJsonToJsObject(partsArray) {
  const fullText = partsArray.map(part => part.text).join('');
  let trimmed = fullText.trim();

  let jsonContent;
  if (trimmed.startsWith('```json')) {
    jsonContent = trimmed.slice(7, trimmed.lastIndexOf('```')).trim();
  } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    jsonContent = trimmed;
  } else {
    throw new Error('Invalid JSON format - response does not start with ```json, { or [');
  }

  // Remove control chars
  jsonContent = jsonContent.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  return JSON.parse(jsonContent);
}

let result;
try {
  const partsArray = apiRes.candidates[0].content.parts;
  result = convertMarkdownJsonToJsObject(partsArray);
} catch (parseError) {
  if (retryCount < maxRetries - 1) {
    staticData.retryCount = retryCount + 1;
    return { _retry: true, _retry_count: retryCount + 1, _err: 'JSON Parse Fail: ' + parseError.message };
  }
  staticData.retryCount = 0;
  const rawSnippet = apiRes.candidates[0].content.parts.map(p => p.text).join('').substring(0, 200);
  console.error('JSON Parse Failed. Raw Snippet:', rawSnippet);
  throw new Error(`Invalid JSON in AI response: ${parseError.message}. Snippet: ${rawSnippet}`);
}

// --- 3. REPORT SUCCESS ---
try {
  await this.helpers.httpRequestWithAuthentication.call(this, 'httpBasicAuth', {
    method: 'POST',
    url: 'https://n8n.teky.vn/webhook/set-key-state',
    body: { key_id: keyInfo.key_id, status: 'success' },
    json: true
  });
} catch (e) { /* ignore reporting error */ }

// Reset retry counter on success
staticData.retryCount = 0;

// --- 4. ADD RETURN-ALONG-WITH ATTRIBUTES ---
const extra = taskInfo.extra || {};
const data = taskInfo.data || {};
const returnAlongWith = extra['return-along-with'] || [];
if (returnAlongWith.length > 0) {
  for (const key of returnAlongWith) {
    if (data.hasOwnProperty(key)) {
      result[key] = data[key];
    }
  }
}

return {
  ...taskInfo,
  task_id: taskInfo.task_id || '',
  task_type: taskInfo.task_type || '',
  result: result,
  extra: extra,
  data: data,
  supabase_task_id: taskInfo.supabase_task_id || taskInfo.id,
  batch_id: taskInfo.batch_id || '',
  launch_id: taskInfo.launch_id || null,
  user_id: taskInfo.user_id || null,
  test_mode: taskInfo.test_mode === true || taskInfo.test_mode === 'true',
  status: 'generated', // ✅ Mark task as generated for DB update
  root_task_id: taskInfo.root_task_id || null,
  hierarchy_path: taskInfo.hierarchy_path || [],
  step_number: parseInt(taskInfo.step_number) || 1,
  stage_key: taskInfo.stage_key || '',
  parent_task_id: taskInfo.parent_task_id || null,
  split_group_id: taskInfo.split_group_id || null,
  requires_approval: taskInfo.requires_approval === true || taskInfo.requires_approval === 'true',
  sequence: taskInfo.sequence || null
};