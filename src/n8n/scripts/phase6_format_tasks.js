// ========== PHASE 6: CREATE NEXT STAGE TASKS ==========
// Handles the output from Phase 5 and creates tasks in Supabase

const config = $json;

// Handle terminate - no next tasks needed
if (config.action === 'terminate') {
    return [];
}

// Handle error
if (config.action === 'error') {
    throw new Error(config.message);
}

// Handle create_tasks_for_branches
if (config.action === 'create_tasks_for_branches') {
    return config.tasks.map(task => ({
        prompt_template_id: task.prompt_template_id,
        task_type: task.task_type || '',
        input_data: task.input_data,
        parent_task_id: task.parent_task_id,
        root_task_id: task.root_task_id,
        hierarchy_path: task.hierarchy_path,
        batch_id: task.batch_id || null,
        user_id: task.user_id || null,
        launch_id: task.launch_id || null, // ✅ Propagate launch_id
        test_mode: task.test_mode,
        sequence: task.sequence,
        total_steps: task.total_steps,
        status: task.status || 'pending',

        // ✅ NEW: Add new fields
        stage_key: task.stage_key,
        step_number: task.step_number,
        split_group_id: task.split_group_id,
        requires_approval: task.requires_approval,
        extra: task.extra
    }));
}

// Fallback: return empty array
return [];
