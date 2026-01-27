import { supabase } from '@/lib/supabase';
import { OrchestratorConfig, StepConfig } from '@/lib/types';

export const configService = {
  async saveConfig(config: {
    name: string;
    description?: string;
    steps: StepConfig[];
  }): Promise<OrchestratorConfig> {
    const { data, error } = await supabase
      .from('orchestrator_configs')
      .insert({
        name: config.name,
        description: config.description,
        steps: config.steps
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async listConfigs(): Promise<OrchestratorConfig[]> {
    const { data, error } = await supabase
      .from('orchestrator_configs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async getConfig(id: string): Promise<OrchestratorConfig> {
    const { data, error } = await supabase
      .from('orchestrator_configs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateConfig(id: string, updates: Partial<OrchestratorConfig>): Promise<OrchestratorConfig> {
    const { data, error } = await supabase
      .from('orchestrator_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async deleteConfig(id: string): Promise<void> {
    const { error } = await supabase
      .from('orchestrator_configs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
