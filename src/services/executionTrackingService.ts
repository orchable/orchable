import { supabase } from '@/lib/supabase';

// Types
export interface StageProgress {
    stage_key: string;
    stage_number: number;
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    running_tasks: number;
    failed_tasks: number;
    progress_percentage: number;
}

export interface ExecutionProgress {
    orchestrator_execution_id: string;
    orchestrator_name: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    total_stages: number;
    current_stage: number;
    overall_progress: number;
    stages: StageProgress[];
}

export interface TaskSummary {
    id: string;
    stage_key: string;
    stage_number: number;
    status: string;
    lo_code: string | null;
    created_at: string;
    completed_at: string | null;
    error_message: string | null;
    parent_task_id?: string | null;
    root_task_id?: string | null;
    hierarchy_path?: string[];
}

/**
 * Get execution progress with stage breakdown
 * Now queries by batch_id instead of orchestrator_execution_id
 */
export async function getExecutionProgress(batchId: string): Promise<ExecutionProgress | null> {
    // Get all tasks for this batch
    const { data: tasks, error: tasksError } = await supabase
        .from('ai_tasks')
        .select('id, stage_key, step_number, status, created_at, completed_at, input_data')
        .eq('batch_id', batchId);

    if (tasksError) {
        console.error('Failed to fetch tasks:', tasksError);
        return null;
    }

    if (!tasks || tasks.length === 0) {
        return null;
    }

    // Extract orchestrator info from first task's input_data
    const firstTask = tasks[0];
    const orchestratorName = (firstTask.input_data as any)?._orchestrator_name || 'Unknown Orchestrator';
    const configId = (firstTask.input_data as any)?._orchestrator_config_id || batchId;

    // Determine status from tasks
    const hasRunning = tasks.some(t => t.status === 'processing' || t.status === 'running');
    const hasFailed = tasks.some(t => t.status === 'failed');
    const allCompleted = tasks.every(t => t.status === 'completed');
    
    let status = 'running';
    if (allCompleted) status = 'completed';
    else if (hasFailed) status = 'failed';
    else if (hasRunning) status = 'processing';

    // Find earliest and latest timestamps
    const startedAt = tasks.reduce((min, t) => {
        const d = t.created_at;
        return !min || d < min ? d : min;
    }, null as string | null);
    
    const completedAt = allCompleted
        ? tasks.reduce((max, t) => {
            const d = t.completed_at;
            return !max || (d && d > max) ? d : max;
        }, null as string | null)
        : null;

    // Group by stage
    const stageMap = new Map<string, {
        stage_key: string;
        stage_number: number;
        tasks: typeof tasks;
    }>();

    tasks.forEach(task => {
        const key = task.stage_key || `stage_${task.step_number || 1}`;
        if (!stageMap.has(key)) {
            stageMap.set(key, {
                stage_key: key,
                stage_number: task.step_number || 1,
                tasks: []
            });
        }
        stageMap.get(key)!.tasks.push(task);
    });

    // Calculate per-stage progress
    const stages: StageProgress[] = [];
    let totalCompleted = 0;
    let totalTasks = 0;

    stageMap.forEach(({ stage_key, stage_number, tasks: stageTasks }) => {
        const completed = stageTasks.filter(t => t.status === 'completed').length;
        const pending = stageTasks.filter(t => t.status === 'pending').length;
        const running = stageTasks.filter(t => t.status === 'processing' || t.status === 'running').length;
        const failed = stageTasks.filter(t => t.status === 'failed').length;
        const total = stageTasks.length;

        stages.push({
            stage_key,
            stage_number,
            total_tasks: total,
            completed_tasks: completed,
            pending_tasks: pending,
            running_tasks: running,
            failed_tasks: failed,
            progress_percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        });

        totalCompleted += completed;
        totalTasks += total;
    });

    // Sort by stage number
    stages.sort((a, b) => a.stage_number - b.stage_number);

    return {
        orchestrator_execution_id: batchId,
        orchestrator_name: orchestratorName,
        status,
        started_at: startedAt,
        completed_at: completedAt,
        total_stages: stages.length,
        current_stage: stages.filter(s => s.completed_tasks > 0).length,
        overall_progress: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
        stages
    };
}

/**
 * Get task list for an execution/batch with optional stage filter
 */
export async function getExecutionTasks(
    batchId: string,
    stageKey?: string
): Promise<TaskSummary[]> {
    let query = supabase
        .from('ai_tasks')
        .select('id, stage_key, step_number, status, lo_code, created_at, completed_at, error_message, parent_task_id, root_task_id, hierarchy_path')
        .or(`batch_id.eq.${batchId},orchestrator_execution_id.eq.${batchId}`)
        .order('step_number')
        .order('created_at');

    if (stageKey) {
        query = query.eq('stage_key', stageKey);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Failed to fetch tasks:', error);
        return [];
    }

    return (data || []).map(task => ({
        id: task.id,
        stage_key: task.stage_key || `stage_${task.step_number || 1}`,
        stage_number: task.step_number || 1,
        status: task.status,
        lo_code: task.lo_code,
        created_at: task.created_at,
        completed_at: task.completed_at,
        error_message: task.error_message,
        parent_task_id: task.parent_task_id,
        root_task_id: task.root_task_id,
        hierarchy_path: task.hierarchy_path
    }));
}

/**
 * Get batch tasks specifically
 */
export async function getBatchTasks(batchId: string) {
    return getExecutionTasks(batchId);
}

/**
 * Get list of executions for an orchestrator config
 */
export async function getOrchestratorExecutions(orchestratorId: string) {
    const { data, error } = await supabase
        .from('orchestrator_executions')
        .select('id, status, started_at, completed_at, created_at, input_data')
        .eq('orchestrator_id', orchestratorId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Failed to fetch executions:', error);
        return [];
    }

    return data || [];
}

/**
 * Subscribe to real-time task updates for a batch
 */
export function subscribeToExecutionUpdates(
    batchId: string,
    onUpdate: (payload: any) => void
) {
    const channel = supabase
        .channel(`batch_${batchId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'ai_tasks',
                filter: `batch_id=eq.${batchId}`
            },
            onUpdate
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
