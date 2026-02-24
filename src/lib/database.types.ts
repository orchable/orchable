export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_tasks: {
        Row: {
          agent_id: string | null
          approved_at: string | null
          approved_by: string | null
          batch_id: string | null
          batch_priority: string | null
          completed_at: string | null
          created_at: string | null
          edit_notes: string | null
          edited_output_data: Json | null
          error_message: string | null
          extra: Json | null
          hierarchy_path: Json | null
          id: string
          input_data: Json | null
          lo_code: string | null
          n8n_execution_id: string | null
          next_task_config: Json | null
          orchestrator_execution_id: string | null
          orchestrator_tracking: Json | null
          output_data: Json | null
          parent_task_id: string | null
          phase_code: string | null
          prompt_template_id: string | null
          requires_approval: boolean | null
          retry_count: number | null
          root_task_id: string | null
          sequence: number | null
          split_group_id: string | null
          stage_key: string | null
          started_at: string | null
          status: string
          step_execution_id: string | null
          step_id: string | null
          step_number: number | null
          task_type: string
          test_mode: boolean | null
          total_steps: number | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          batch_priority?: string | null
          completed_at?: string | null
          created_at?: string | null
          edit_notes?: string | null
          edited_output_data?: Json | null
          error_message?: string | null
          extra?: Json | null
          hierarchy_path?: Json | null
          id?: string
          input_data?: Json | null
          lo_code?: string | null
          n8n_execution_id?: string | null
          next_task_config?: Json | null
          orchestrator_execution_id?: string | null
          orchestrator_tracking?: Json | null
          output_data?: Json | null
          parent_task_id?: string | null
          phase_code?: string | null
          prompt_template_id?: string | null
          requires_approval?: boolean | null
          retry_count?: number | null
          root_task_id?: string | null
          sequence?: number | null
          split_group_id?: string | null
          stage_key?: string | null
          started_at?: string | null
          status?: string
          step_execution_id?: string | null
          step_id?: string | null
          step_number?: number | null
          task_type: string
          test_mode?: boolean | null
          total_steps?: number | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          batch_priority?: string | null
          completed_at?: string | null
          created_at?: string | null
          edit_notes?: string | null
          edited_output_data?: Json | null
          error_message?: string | null
          extra?: Json | null
          hierarchy_path?: Json | null
          id?: string
          input_data?: Json | null
          lo_code?: string | null
          n8n_execution_id?: string | null
          next_task_config?: Json | null
          orchestrator_execution_id?: string | null
          orchestrator_tracking?: Json | null
          output_data?: Json | null
          parent_task_id?: string | null
          phase_code?: string | null
          prompt_template_id?: string | null
          requires_approval?: boolean | null
          retry_count?: number | null
          root_task_id?: string | null
          sequence?: number | null
          split_group_id?: string | null
          stage_key?: string | null
          started_at?: string | null
          status?: string
          step_execution_id?: string | null
          step_id?: string | null
          step_number?: number | null
          task_type?: string
          test_mode?: boolean | null
          total_steps?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_orchestrator_execution_id_fkey"
            columns: ["orchestrator_execution_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks_with_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_failed_tasks_for_retry"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_processing_tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_runnable_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_awaiting_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_prompt_template_id_fkey"
            columns: ["prompt_template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks_with_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_failed_tasks_for_retry"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_processing_tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_runnable_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_awaiting_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_step_execution_id_fkey"
            columns: ["step_execution_id"]
            isOneToOne: false
            referencedRelation: "step_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          los_count: number
          questions_completed: number
          questions_failed: number
          sheet_id: string
          sheet_url: string
          started_at: string | null
          status: string
          tab_name: string
          user_email: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          los_count: number
          questions_completed?: number
          questions_failed?: number
          sheet_id: string
          sheet_url: string
          started_at?: string | null
          status?: string
          tab_name?: string
          user_email: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          los_count?: number
          questions_completed?: number
          questions_failed?: number
          sheet_id?: string
          sheet_url?: string
          started_at?: string | null
          status?: string
          tab_name?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      batch_questions: {
        Row: {
          batch_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          error_severity: string | null
          id: string
          lo_code: string
          lo_data: Json
          question_data: Json | null
          retry_count: number
          started_at: string | null
          status: string
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          error_severity?: string | null
          id?: string
          lo_code: string
          lo_data: Json
          question_data?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          error_severity?: string | null
          id?: string
          lo_code?: string
          lo_data?: Json
          question_data?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_questions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_executions: {
        Row: {
          completed_at: string | null
          completed_steps: number | null
          config_id: string
          created_at: string | null
          error_message: string | null
          failed_steps: number | null
          id: string
          started_at: string | null
          status: string
          syllabus_row: Json
          total_steps: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: number | null
          config_id: string
          created_at?: string | null
          error_message?: string | null
          failed_steps?: number | null
          id?: string
          started_at?: string | null
          status?: string
          syllabus_row: Json
          total_steps?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_steps?: number | null
          config_id?: string
          created_at?: string | null
          error_message?: string | null
          failed_steps?: number | null
          id?: string
          started_at?: string | null
          status?: string
          syllabus_row?: Json
          total_steps?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_executions_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "lab_orchestrator_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orchestrator_configs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          n8n_workflow_id: string | null
          name: string
          steps: Json
          updated_at: string | null
          viewport: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          n8n_workflow_id?: string | null
          name: string
          steps: Json
          updated_at?: string | null
          viewport?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          n8n_workflow_id?: string | null
          name?: string
          steps?: Json
          updated_at?: string | null
          viewport?: Json | null
        }
        Relationships: []
      }
      lab_step_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_id: string
          id: string
          max_retries: number | null
          n8n_execution_id: string | null
          result: Json | null
          retry_count: number | null
          started_at: string | null
          status: string
          step_id: string
          step_name: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          id?: string
          max_retries?: number | null
          n8n_execution_id?: string | null
          result?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          step_id: string
          step_name: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          id?: string
          max_retries?: number | null
          n8n_execution_id?: string | null
          result?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          step_id?: string
          step_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_step_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "lab_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      orchestrator_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_phase_id: string | null
          current_step_id: string | null
          error_message: string | null
          error_phase_id: string | null
          error_step_id: string | null
          id: string
          input_data: Json
          n8n_execution_id: string | null
          orchestrator_id: string
          output_data: Json | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_phase_id?: string | null
          current_step_id?: string | null
          error_message?: string | null
          error_phase_id?: string | null
          error_step_id?: string | null
          id?: string
          input_data: Json
          n8n_execution_id?: string | null
          orchestrator_id: string
          output_data?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_phase_id?: string | null
          current_step_id?: string | null
          error_message?: string | null
          error_phase_id?: string | null
          error_step_id?: string | null
          id?: string
          input_data?: Json
          n8n_execution_id?: string | null
          orchestrator_id?: string
          output_data?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orchestrator_executions_current_phase_id_fkey"
            columns: ["current_phase_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchestrator_executions_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchestrator_executions_orchestrator_id_fkey"
            columns: ["orchestrator_id"]
            isOneToOne: false
            referencedRelation: "orchestrators"
            referencedColumns: ["id"]
          },
        ]
      }
      orchestrator_phases: {
        Row: {
          approval_message: string | null
          created_at: string | null
          description: string | null
          fallback_workflow_id: string | null
          id: string
          n8n_webhook_path: string | null
          n8n_workflow_id: string | null
          name: string
          on_error: string | null
          orchestrator_id: string
          order_index: number
          requires_approval: boolean | null
          updated_at: string | null
        }
        Insert: {
          approval_message?: string | null
          created_at?: string | null
          description?: string | null
          fallback_workflow_id?: string | null
          id?: string
          n8n_webhook_path?: string | null
          n8n_workflow_id?: string | null
          name: string
          on_error?: string | null
          orchestrator_id: string
          order_index: number
          requires_approval?: boolean | null
          updated_at?: string | null
        }
        Update: {
          approval_message?: string | null
          created_at?: string | null
          description?: string | null
          fallback_workflow_id?: string | null
          id?: string
          n8n_webhook_path?: string | null
          n8n_workflow_id?: string | null
          name?: string
          on_error?: string | null
          orchestrator_id?: string
          order_index?: number
          requires_approval?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchestrator_phases_orchestrator_id_fkey"
            columns: ["orchestrator_id"]
            isOneToOne: false
            referencedRelation: "orchestrators"
            referencedColumns: ["id"]
          },
        ]
      }
      orchestrator_steps: {
        Row: {
          created_at: string | null
          description: string | null
          handler_endpoint: string | null
          id: string
          input_schema: Json | null
          n8n_webhook_path: string | null
          n8n_workflow_id: string | null
          name: string
          order_index: number
          output_schema: Json | null
          phase_id: string
          retry_count: number | null
          timeout_seconds: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          handler_endpoint?: string | null
          id?: string
          input_schema?: Json | null
          n8n_webhook_path?: string | null
          n8n_workflow_id?: string | null
          name: string
          order_index: number
          output_schema?: Json | null
          phase_id: string
          retry_count?: number | null
          timeout_seconds?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          handler_endpoint?: string | null
          id?: string
          input_schema?: Json | null
          n8n_webhook_path?: string | null
          n8n_workflow_id?: string | null
          name?: string
          order_index?: number
          output_schema?: Json | null
          phase_id?: string
          retry_count?: number | null
          timeout_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orchestrator_steps_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      orchestrators: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          is_template: boolean | null
          name: string
          status: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          is_template?: boolean | null
          name: string
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          is_template?: boolean | null
          name?: string
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchestrators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchestrators_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "orchestrators"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_ai_settings: Json | null
          description: string | null
          id: string
          input_schema: Json | null
          is_active: boolean | null
          name: string
          next_stage_template_id: string | null
          next_stage_template_ids: Json | null
          organization_code: string | null
          output_schema: Json | null
          requires_approval: boolean | null
          stage_config: Json | null
          template: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          default_ai_settings?: Json | null
          description?: string | null
          id: string
          input_schema?: Json | null
          is_active?: boolean | null
          name: string
          next_stage_template_id?: string | null
          next_stage_template_ids?: Json | null
          organization_code?: string | null
          output_schema?: Json | null
          requires_approval?: boolean | null
          stage_config?: Json | null
          template: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          default_ai_settings?: Json | null
          description?: string | null
          id?: string
          input_schema?: Json | null
          is_active?: boolean | null
          name?: string
          next_stage_template_id?: string | null
          next_stage_template_ids?: Json | null
          organization_code?: string | null
          output_schema?: Json | null
          requires_approval?: boolean | null
          stage_config?: Json | null
          template?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_next_stage_fkey"
            columns: ["next_stage_template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      step_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_id: string
          id: string
          input_data: Json | null
          n8n_execution_id: string | null
          output_data: Json | null
          retry_count: number | null
          started_at: string | null
          status: string | null
          step_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          n8n_execution_id?: string | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          step_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          n8n_execution_id?: string | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_executions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      task_batches: {
        Row: {
          completed_at: string | null
          completed_tasks: number
          config: Json | null
          created_at: string | null
          created_by: string | null
          exam_round_code: string | null
          failed_tasks: number
          grade_code: string
          id: string
          n8n_execution_id: string | null
          n8n_workflow_id: string | null
          name: string
          pending_tasks: number
          preset_key: string
          processing_tasks: number
          source_file: string | null
          started_at: string | null
          status: string
          total_tasks: number
          updated_at: string | null
          week_range: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_tasks?: number
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          exam_round_code?: string | null
          failed_tasks?: number
          grade_code: string
          id?: string
          n8n_execution_id?: string | null
          n8n_workflow_id?: string | null
          name: string
          pending_tasks?: number
          preset_key: string
          processing_tasks?: number
          source_file?: string | null
          started_at?: string | null
          status?: string
          total_tasks?: number
          updated_at?: string | null
          week_range?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_tasks?: number
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          exam_round_code?: string | null
          failed_tasks?: number
          grade_code?: string
          id?: string
          n8n_execution_id?: string | null
          n8n_workflow_id?: string | null
          name?: string
          pending_tasks?: number
          preset_key?: string
          processing_tasks?: number
          source_file?: string | null
          started_at?: string | null
          status?: string
          total_tasks?: number
          updated_at?: string | null
          week_range?: string | null
        }
        Relationships: []
      }
      task_sync_barriers: {
        Row: {
          completed_count: number | null
          created_at: string | null
          expected_count: number
          is_ready: boolean | null
          merge_strategy: string | null
          next_template_id: string | null
          sync_group_id: string
          updated_at: string | null
          waiting_task_ids: Json | null
        }
        Insert: {
          completed_count?: number | null
          created_at?: string | null
          expected_count: number
          is_ready?: boolean | null
          merge_strategy?: string | null
          next_template_id?: string | null
          sync_group_id: string
          updated_at?: string | null
          waiting_task_ids?: Json | null
        }
        Update: {
          completed_count?: number | null
          created_at?: string | null
          expected_count?: number
          is_ready?: boolean | null
          merge_strategy?: string | null
          next_template_id?: string | null
          sync_group_id?: string
          updated_at?: string | null
          waiting_task_ids?: Json | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          settings: Json | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
          settings?: Json | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          settings?: Json | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      ai_tasks_with_template: {
        Row: {
          agent_id: string | null
          approved_at: string | null
          approved_by: string | null
          batch_id: string | null
          batch_priority: string | null
          completed_at: string | null
          created_at: string | null
          default_ai_settings: Json | null
          edit_notes: string | null
          edited_output_data: Json | null
          error_message: string | null
          extra: Json | null
          hierarchy_path: Json | null
          id: string | null
          input_data: Json | null
          lo_code: string | null
          n8n_execution_id: string | null
          next_stage_template_ids: Json | null
          next_task_config: Json | null
          orchestrator_execution_id: string | null
          orchestrator_tracking: Json | null
          output_data: Json | null
          parent_task_id: string | null
          phase_code: string | null
          prompt_template_id: string | null
          prompt_text: string | null
          requires_approval: boolean | null
          retry_count: number | null
          root_task_id: string | null
          sequence: number | null
          split_group_id: string | null
          stage_config: Json | null
          stage_key: string | null
          started_at: string | null
          status: string | null
          step_execution_id: string | null
          step_id: string | null
          step_number: number | null
          task_type: string | null
          test_mode: boolean | null
          total_steps: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_orchestrator_execution_id_fkey"
            columns: ["orchestrator_execution_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks_with_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_failed_tasks_for_retry"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_processing_tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_runnable_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_awaiting_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_prompt_template_id_fkey"
            columns: ["prompt_template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks_with_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_failed_tasks_for_retry"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_processing_tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_runnable_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_awaiting_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_step_execution_id_fkey"
            columns: ["step_execution_id"]
            isOneToOne: false
            referencedRelation: "step_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      v_failed_tasks_for_retry: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          created_at: string | null
          error_message: string | null
          failed_at: string | null
          grade_code: string | null
          lo_code: string | null
          retry_count: number | null
          task_id: string | null
          task_type: string | null
        }
        Relationships: []
      }
      v_processing_tasks: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          grade_code: string | null
          lo_code: string | null
          n8n_execution_id: string | null
          running_seconds: number | null
          started_at: string | null
          task_id: string | null
          task_type: string | null
        }
        Relationships: []
      }
      v_runnable_tasks: {
        Row: {
          agent_id: string | null
          ai_settings: Json | null
          batch_id: string | null
          batch_priority: string | null
          created_at: string | null
          extra: Json | null
          hierarchy_path: Json | null
          id: string | null
          input_data: Json | null
          lo_code: string | null
          model_id: string | null
          next_stage_template_id: Json | null
          next_stage_template_ids: Json | null
          next_task_config: Json | null
          orchestrator_execution_id: string | null
          parent_task_id: string | null
          phase_code: string | null
          prompt: string | null
          prompt_template_id: string | null
          requires_approval: boolean | null
          root_task_id: string | null
          sequence: number | null
          split_group_id: string | null
          stage_key: string | null
          status: string | null
          step_execution_id: string | null
          step_id: string | null
          step_number: number | null
          task_type: string | null
          temperature: number | null
          test_mode: boolean | null
          total_steps: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_orchestrator_execution_id_fkey"
            columns: ["orchestrator_execution_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks_with_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_failed_tasks_for_retry"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_processing_tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_runnable_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_awaiting_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_prompt_template_id_fkey"
            columns: ["prompt_template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks_with_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_failed_tasks_for_retry"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_processing_tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_runnable_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_root_task_id_fkey"
            columns: ["root_task_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_awaiting_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_step_execution_id_fkey"
            columns: ["step_execution_id"]
            isOneToOne: false
            referencedRelation: "step_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      v_tasks_awaiting_approval: {
        Row: {
          ai_settings: Json | null
          approved_at: string | null
          approved_by: string | null
          batch_id: string | null
          batch_name: string | null
          completed_at: string | null
          created_at: string | null
          edit_notes: string | null
          edited_output_data: Json | null
          grade_code: string | null
          id: string | null
          input_data: Json | null
          output_data: Json | null
          preset_key: string | null
          prompt: string | null
          prompt_template_id: string | null
          requires_approval: boolean | null
          sequence: number | null
          stage_key: string | null
          status: string | null
          total_steps: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_prompt_template_id_fkey"
            columns: ["prompt_template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_task: {
        Args: {
          p_edit_notes?: string
          p_edited_output?: Json
          p_task_id: string
          p_user_id: string
        }
        Returns: string
      }
      claim_runnable_tasks: {
        Args: { batch_limit?: number; max_processing?: number }
        Returns: {
          agent_id: string | null
          approved_at: string | null
          approved_by: string | null
          batch_id: string | null
          batch_priority: string | null
          completed_at: string | null
          created_at: string | null
          edit_notes: string | null
          edited_output_data: Json | null
          error_message: string | null
          extra: Json | null
          hierarchy_path: Json | null
          id: string
          input_data: Json | null
          lo_code: string | null
          n8n_execution_id: string | null
          next_task_config: Json | null
          orchestrator_execution_id: string | null
          orchestrator_tracking: Json | null
          output_data: Json | null
          parent_task_id: string | null
          phase_code: string | null
          prompt_template_id: string | null
          requires_approval: boolean | null
          retry_count: number | null
          root_task_id: string | null
          sequence: number | null
          split_group_id: string | null
          stage_key: string | null
          started_at: string | null
          status: string
          step_execution_id: string | null
          step_id: string | null
          step_number: number | null
          task_type: string
          test_mode: boolean | null
          total_steps: number | null
          user_id: string | null
        }[]
      }
      create_next_stage_tasks: {
        Args: { p_parent_task_id: string; p_tasks: string }
        Returns: {
          sequence: number
          task_id: string
        }[]
      }
      create_next_task_in_chain: {
        Args: { p_parent_task_id: string }
        Returns: string
      }
      get_batch_progress: {
        Args: { p_batch_id: string }
        Returns: {
          batch_id: string
          batch_name: string
          completed_tasks: number
          elapsed_seconds: number
          failed_tasks: number
          grade_code: string
          pending_tasks: number
          preset_key: string
          processing_tasks: number
          progress_pct: number
          started_at: string
          status: string
          total_tasks: number
        }[]
      }
      get_hierarchy_progress: {
        Args: { p_root_task_id: string }
        Returns: {
          completed_tasks: number
          failed_tasks: number
          pending_tasks: number
          processing_tasks: number
          progress_percentage: number
          root_task_id: string
          total_tasks: number
        }[]
      }
      increment_sync_barrier: {
        Args: { p_sync_group_id: string; p_task_id: string }
        Returns: {
          is_ready: boolean
          merge_strategy: string
          next_template_id: string
          sync_group_id: string
          waiting_task_ids: Json
        }[]
      }
      mark_zombie_tasks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      regenerate_task: {
        Args: { p_task_id: string }
        Returns: string
      }
      reset_batch_to_pending: {
        Args: { p_batch_id: string; p_include_completed?: boolean }
        Returns: {
          reset_count: number
          task_ids: string[]
        }[]
      }
      reset_tasks_to_pending: {
        Args: {
          p_batch_id?: string
          p_reset_retry_count?: boolean
          p_status_filter?: string[]
        }
        Returns: {
          reset_count: number
          task_ids: string[]
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

