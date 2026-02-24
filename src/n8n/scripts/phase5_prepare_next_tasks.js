// ========== PHASE 5: DETERMINE & CREATE NEXT STAGE TASKS (GRT SUPPORT) ==========
// This node handles task chaining and parallel branching.
// It uses the Global Routing Table (GRT) provided in 'extra' to hydrate child tasks.

const task = $json;
const extra = task.extra || {};

// Get current stage config
const currentStageConfig = extra.current_stage_config || null;

// Get next stage configs (hydrated roadmap from parent)
// Get next stage configs (hydrated roadmap from parent)
// Normalization: Ensure it's always an array
let nextConfigs = extra.next_stage_configs || extra.next_stage_config || [];
if (!Array.isArray(nextConfigs)) {
  nextConfigs = [nextConfigs];
}

// Get Global Routing Table for recursive hydration
const grt = extra.grt || {};

// === TERMINATE: No next stage ===
if (!currentStageConfig || nextConfigs.length === 0) {
  return {
    action: 'terminate',
    task_id: task.supabase_task_id,
    message: 'No next stage configured - final stage reached'
  };
}

const cardinality = currentStageConfig.cardinality || 'one_to_one';
const result = task.result;
const inputData = task.data || {};

// Helper: extract stage key from template ID
function extractStageKey(templateId) {
  if (!templateId) return 'unknown_stage';
  // Example: "uuid_stage_name" -> "stage_name"
  const parts = templateId.split('_');
  if (parts.length < 2) return templateId;
  return parts.slice(1).join('_');
}

const currentStageKey = task.stage_key || (currentStageConfig.template_id ? extractStageKey(currentStageConfig.template_id) : 'unknown_stage');
const rootId = task.root_task_id || task.supabase_task_id;
const hierarchyPath = [...(task.hierarchy_path || []), task.supabase_task_id];
const currentStepNumber = parseInt(task.step_number) || 1;

// Helper: build metadata for a new child task
function buildTaskMetadata(nextConfig, index, total, dataForTask) {
  const nextTplId = nextConfig.template_id || nextConfig.prompt_id;
  const nextStageKey = extractStageKey(nextTplId);

  // Parse task_type suffix (BUG-4 Fix)
  const taskTypeMatch = nextTplId.match(/^[0-9a-f-]+_(.+)$/);
  const taskType = taskTypeMatch ? taskTypeMatch[1] : nextStageKey;

  // RECURSIVE HYDRATION using GRT
  const childRouting = grt[nextTplId] || {};
  const grandChildIds = childRouting.next_ids || [];
  const grandChildConfigs = grandChildIds.map(gcId => {
    const gcInfo = grt[gcId];
    if (!gcInfo) return null;
    return {
      template_id: gcInfo.template_id,
      prompt_id: gcInfo.prompt_id,
      cardinality: gcInfo.cardinality,
      split_mode: gcInfo.split_mode,
      split_path: gcInfo.split_path,
      output_mapping: gcInfo.output_mapping
    };
  }).filter(Boolean);

  return {
    prompt_template_id: childRouting.template_id || nextTplId,
    task_type: taskType,
    input_data: dataForTask,
    parent_task_id: task.supabase_task_id, // Fix BUG-3
    root_task_id: rootId,
    hierarchy_path: hierarchyPath,
    batch_id: (currentStageConfig?.batch_grouping === 'isolated') ? null : (task.batch_id || null),
    launch_id: task.launch_id || null, // ✅ Propagate launch_id to child tasks
    test_mode: task.test_mode || false,
    sequence: index + 1,
    total_steps: total,
    status: 'pending',

    // Metadata preservation
    stage_key: nextStageKey,
    step_number: currentStepNumber + 1,
    split_group_id: task.split_group_id,
    requires_approval: childRouting.requires_approval || task.requires_approval || false,

    extra: {
      current_stage_config: {
        template_id: childRouting.template_id || nextTplId,
        prompt_id: childRouting.prompt_id || null,
        cardinality: childRouting.cardinality || 'one_to_one',
        split_path: childRouting.split_path || null,
        split_mode: childRouting.split_mode || 'per_item',
        output_mapping: childRouting.output_mapping || 'result'
      },
      next_stage_configs: grandChildConfigs, // ✅ PASSING THE ROADMAP
      grt: grt, // ✅ PASSING THE ENGINE
      parent_stage_key: currentStageKey,
      parent_task_id: task.supabase_task_id
    }
  };
}

// === EXECUTE BRANCHING ===
let finalTasks = [];

if (cardinality === 'one_to_one') {
  finalTasks = nextConfigs.map((cfg, idx) => buildTaskMetadata(cfg, idx, 1, result));
} else if (cardinality === 'one_to_many') {
  const splitPath = currentStageConfig.split_path || 'result';

  // Navigate to array
  const pathParts = splitPath.split('.');
  let arrayToSplit = result;
  for (const part of pathParts) {
    if (part === 'result') continue;
    arrayToSplit = arrayToSplit?.[part];
  }

  if (Array.isArray(arrayToSplit)) {
    const splitMode = currentStageConfig.split_mode || 'per_item';
    for (const nextConfig of nextConfigs) {
      if (splitMode === 'per_item') {
        arrayToSplit.forEach((item, idx) => {
          finalTasks.push(buildTaskMetadata(nextConfig, idx, arrayToSplit.length, {
            ...inputData,
            user_id: task.user_id || null,
            batch_id: task.batch_id || null,
            launch_id: task.launch_id || null,
            item: item,
            _split_index: idx,
            _split_total: arrayToSplit.length
          }));
        });
      } else if (splitMode === 'per_batch') {
        const batchSize = currentStageConfig.batch_size || 10;
        for (let i = 0, bIdx = 0; i < arrayToSplit.length; i += batchSize, bIdx++) {
          const batchItems = arrayToSplit.slice(i, i + batchSize);
          finalTasks.push(buildTaskMetadata(nextConfig, bIdx, Math.ceil(arrayToSplit.length / batchSize), {
            ...inputData,
            user_id: task.user_id || null,
            batch_id: task.batch_id || null,
            launch_id: task.launch_id || null,
            items: batchItems,
            _batch_index: bIdx
          }));
        }
      }
    }
  }
}

return {
  action: finalTasks.length > 0 ? 'create_tasks_for_branches' : 'terminate',
  tasks: finalTasks,
  total_count: finalTasks.length,
  task_id: task.supabase_task_id
};