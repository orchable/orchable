// ========== PHASE 1: GET & PARSE TASK ==========
// Merged from: Filter A Task + JSON Parse

const tasks = $input.all().map(item => item.json);
if (tasks.length === 0) return [];

// Sort by priority: test_mode > batch_priority > sequence > created_at
const sortedTasks = tasks.sort((a, b) => {
  const testModeA = a.test_mode === true || a.test_mode === 'true';
  const testModeB = b.test_mode === true || b.test_mode === 'true';
  if (testModeA && !testModeB) return -1;
  if (!testModeA && testModeB) return 1;

  if (a.batch_priority && b.batch_priority) {
    const priorityA = new Date(a.batch_priority).getTime();
    const priorityB = new Date(b.batch_priority).getTime();
    if (priorityA !== priorityB) return priorityA - priorityB;
  } else if (a.batch_priority) return -1;
  else if (b.batch_priority) return 1;

  const seqA = parseInt(a.sequence) || 1;
  const seqB = parseInt(b.sequence) || 1;
  if (seqA !== seqB) return seqA - seqB;

  if (a.created_at && b.created_at) {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  }
  return 0;
});

const t = sortedTasks[0];

// Parse JSON string fields safely
const safeParse = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

return {
  ...t,
  task_id: t.task_id || '',
  supabase_task_id: t.supabase_task_id || t.id,
  launch_id: t.launch_id || null,
  user_id: t.user_id || null,
  batch_id: t.batch_id || '',
  extra: safeParse(t.extra, {}),
  data: safeParse(t.data, {}),
  ai_settings: safeParse(t.ai_settings, {}),
  hierarchy_path: safeParse(t.hierarchy_path, []),
  step_number: parseInt(t.step_number) || 1,
  stage_key: t.stage_key || '',
  parent_task_id: t.parent_task_id || null,
  split_group_id: t.split_group_id || null,
  test_mode: t.test_mode === true || t.test_mode === 'true',
  requires_approval: t.requires_approval === true || t.requires_approval === 'true',
  _retry_count: 0
};