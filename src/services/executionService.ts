import { supabase } from '@/lib/supabase';
import { Execution, StepExecution, SyllabusRow } from '@/lib/types';

export const executionService = {
  async createExecution(data: {
    configId: string;
    syllabusRow: SyllabusRow;
  }): Promise<Execution> {
    // Đầu tiên, lấy config để biết total_steps
    const { data: config } = await supabase
      .from('lab_orchestrator_configs')
      .select('steps')
      .eq('id', data.configId)
      .single();
    
    // cast config.steps explicit
    const steps = (config?.steps || []) as any[];
    const totalSteps = steps.length;
    
    // Tạo execution record
    const { data: execution, error } = await supabase
      .from('executions')
      .insert({
        config_id: data.configId,
        syllabus_row: data.syllabusRow,
        status: 'pending',
        total_steps: totalSteps,
        completed_steps: 0,
        failed_steps: 0
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Tạo step_execution records cho tất cả các steps
    const stepExecutions = steps.map((step: any) => ({
      execution_id: execution.id,
      step_id: step.id,
      step_name: step.name,
      status: 'pending',
      max_retries: step.retryConfig?.maxRetries || 3,
      retry_count: 0
    }));
    
    if (stepExecutions.length > 0) {
        await supabase
        .from('step_executions')
        .insert(stepExecutions);
    }
    
    return execution;
  },
  
  async listExecutions(): Promise<Execution[]> {
    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async getExecution(id: string): Promise<Execution> {
    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateExecutionStatus(
    id: string, 
    status: Execution['status'],
    additionalData?: Partial<Execution>
  ): Promise<void> {
    const { error } = await supabase
      .from('executions')
      .update({
        status,
        ...additionalData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async getStepExecutions(executionId: string) {
      const { data, error } = await supabase
        .from('step_executions')
        .select('*')
        .eq('execution_id', executionId)
        .order('step_name', { ascending: true }); // A, B, C...

      if (error) throw error;
      return data as StepExecution[];
  }
};
