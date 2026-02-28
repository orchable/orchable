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
      ai_model_settings: {
        Row: {
          capabilities: Json | null
          category: string | null
          created_at: string | null
          description: string | null
          free_tier_rpd: number | null
          free_tier_rpm: number | null
          free_tier_tpm: number | null
          generate_content_api: string | null
          id: string
          input_token_limit: number | null
          is_active: boolean | null
          max_output_tokens: number | null
          model_id: string
          name: string
          organization_code: string | null
          output_token_limit: number | null
          recommended_thinking: string | null
          retries: number | null
          supported_inputs: Json | null
          supported_outputs: Json | null
          tagline: string | null
          temperature: number | null
          thinking_config_type: string | null
          timeout_ms: number | null
          top_k: number | null
          top_p: number | null
          updated_at: string | null
          use_case_tags: Json | null
          user_id: string | null
        }
        Insert: {
          capabilities?: Json | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          free_tier_rpd?: number | null
          free_tier_rpm?: number | null
          free_tier_tpm?: number | null
          generate_content_api?: string | null
          id?: string
          input_token_limit?: number | null
          is_active?: boolean | null
          max_output_tokens?: number | null
          model_id: string
          name: string
          organization_code?: string | null
          output_token_limit?: number | null
          recommended_thinking?: string | null
          retries?: number | null
          supported_inputs?: Json | null
          supported_outputs?: Json | null
          tagline?: string | null
          temperature?: number | null
          thinking_config_type?: string | null
          timeout_ms?: number | null
          top_k?: number | null
          top_p?: number | null
          updated_at?: string | null
          use_case_tags?: Json | null
          user_id?: string | null
        }
        Update: {
          capabilities?: Json | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          free_tier_rpd?: number | null
          free_tier_rpm?: number | null
          free_tier_tpm?: number | null
          generate_content_api?: string | null
          id?: string
          input_token_limit?: number | null
          is_active?: boolean | null
          max_output_tokens?: number | null
          model_id?: string
          name?: string
          organization_code?: string | null
          output_token_limit?: number | null
          recommended_thinking?: string | null
          retries?: number | null
          supported_inputs?: Json | null
          supported_outputs?: Json | null
          tagline?: string | null
          temperature?: number | null
          thinking_config_type?: string | null
          timeout_ms?: number | null
          top_k?: number | null
          top_p?: number | null
          updated_at?: string | null
          use_case_tags?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
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
          launch_id: string | null
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
          status: Database["public"]["Enums"]["ai_task_status"]
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
          launch_id?: string | null
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
          status?: Database["public"]["Enums"]["ai_task_status"]
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
          launch_id?: string | null
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
          status?: Database["public"]["Enums"]["ai_task_status"]
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
            foreignKeyName: "ai_tasks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "task_batches"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_stuck_tasks"
            referencedColumns: ["task_id"]
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
            referencedRelation: "v_stuck_tasks"
            referencedColumns: ["task_id"]
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
      alembic_version: {
        Row: {
          version_num: string
        }
        Insert: {
          version_num: string
        }
        Update: {
          version_num?: string
        }
        Relationships: []
      }
      api_key_health: {
        Row: {
          block_reason: string | null
          blocked_until: string | null
          consecutive_failures: number
          failed_requests: number
          last_error_code: string | null
          last_failure_at: string | null
          last_success_at: string | null
          last_used_at: string | null
          successful_requests: number
          total_requests: number
          updated_at: string
          user_api_key_id: string
          user_id: string | null
        }
        Insert: {
          block_reason?: string | null
          blocked_until?: string | null
          consecutive_failures?: number
          failed_requests?: number
          last_error_code?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          last_used_at?: string | null
          successful_requests?: number
          total_requests?: number
          updated_at?: string
          user_api_key_id: string
          user_id?: string | null
        }
        Update: {
          block_reason?: string | null
          blocked_until?: string | null
          consecutive_failures?: number
          failed_requests?: number
          last_error_code?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          last_used_at?: string | null
          successful_requests?: number
          total_requests?: number
          updated_at?: string
          user_api_key_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_health_user_api_key_id_fkey"
            columns: ["user_api_key_id"]
            isOneToOne: true
            referencedRelation: "user_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key_usage_log: {
        Row: {
          error_code: string | null
          error_message: string | null
          id: string
          job_id: string | null
          latency_ms: number | null
          metadata_json: Json | null
          model_used: string | null
          request_type: string | null
          success: boolean | null
          task_id: string | null
          tokens_used: number | null
          used_at: string
          user_api_key_id: string
          user_id: string | null
        }
        Insert: {
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          latency_ms?: number | null
          metadata_json?: Json | null
          model_used?: string | null
          request_type?: string | null
          success?: boolean | null
          task_id?: string | null
          tokens_used?: number | null
          used_at?: string
          user_api_key_id: string
          user_id?: string | null
        }
        Update: {
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          latency_ms?: number | null
          metadata_json?: Json | null
          model_used?: string | null
          request_type?: string | null
          success?: boolean | null
          task_id?: string | null
          tokens_used?: number | null
          used_at?: string
          user_api_key_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_log_user_api_key_id_fkey"
            columns: ["user_api_key_id"]
            isOneToOne: false
            referencedRelation: "user_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          diversity_metrics: Json | null
          error_message: string | null
          id: string
          los_count: number | null
          questions_completed: number | null
          questions_failed: number | null
          questions_per_lo: number | null
          retry_count: number | null
          sheet_id: string | null
          sheet_url: string | null
          started_at: string | null
          status: string | null
          tab_name: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          diversity_metrics?: Json | null
          error_message?: string | null
          id: string
          los_count?: number | null
          questions_completed?: number | null
          questions_failed?: number | null
          questions_per_lo?: number | null
          retry_count?: number | null
          sheet_id?: string | null
          sheet_url?: string | null
          started_at?: string | null
          status?: string | null
          tab_name?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          diversity_metrics?: Json | null
          error_message?: string | null
          id?: string
          los_count?: number | null
          questions_completed?: number | null
          questions_failed?: number | null
          questions_per_lo?: number | null
          retry_count?: number | null
          sheet_id?: string | null
          sheet_url?: string | null
          started_at?: string | null
          status?: string | null
          tab_name?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      batch_questions: {
        Row: {
          batch_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          error_severity: string | null
          generated_count: number | null
          id: string
          lo_code: string | null
          question_data: Json | null
          retry_count: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          error_severity?: string | null
          generated_count?: number | null
          id: string
          lo_code?: string | null
          question_data?: Json | null
          retry_count?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          error_severity?: string | null
          generated_count?: number | null
          id?: string
          lo_code?: string | null
          question_data?: Json | null
          retry_count?: number | null
          status?: string | null
          user_id?: string | null
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
      blueprint_presets: {
        Row: {
          content: string
          created_at: string | null
          file_name: string
          grade_code: string
          id: string
          lo_count: number | null
          metadata: Json | null
          preset_key: string
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          file_name: string
          grade_code: string
          id?: string
          lo_count?: number | null
          metadata?: Json | null
          preset_key: string
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          file_name?: string
          grade_code?: string
          id?: string
          lo_count?: number | null
          metadata?: Json | null
          preset_key?: string
          version?: number | null
        }
        Relationships: []
      }
      category_subjects: {
        Row: {
          category_code: string
          created_at: string | null
          subject_code: string
        }
        Insert: {
          category_code: string
          created_at?: string | null
          subject_code: string
        }
        Update: {
          category_code?: string
          created_at?: string | null
          subject_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_subjects_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "knowledge_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "category_subjects_subject_code_fkey"
            columns: ["subject_code"]
            isOneToOne: false
            referencedRelation: "knowledge_subjects"
            referencedColumns: ["code"]
          },
        ]
      }
      celery_task_history: {
        Row: {
          args: Json | null
          completed_at: string | null
          created_at: string | null
          exception: string | null
          id: string
          kwargs: Json | null
          received_at: string | null
          result: Json | null
          retries: number | null
          runtime_seconds: number | null
          started_at: string | null
          state: string
          task_id: string
          task_name: string
          traceback: string | null
          updated_at: string | null
          user_id: string | null
          worker: string | null
        }
        Insert: {
          args?: Json | null
          completed_at?: string | null
          created_at?: string | null
          exception?: string | null
          id: string
          kwargs?: Json | null
          received_at?: string | null
          result?: Json | null
          retries?: number | null
          runtime_seconds?: number | null
          started_at?: string | null
          state: string
          task_id: string
          task_name: string
          traceback?: string | null
          updated_at?: string | null
          user_id?: string | null
          worker?: string | null
        }
        Update: {
          args?: Json | null
          completed_at?: string | null
          created_at?: string | null
          exception?: string | null
          id?: string
          kwargs?: Json | null
          received_at?: string | null
          result?: Json | null
          retries?: number | null
          runtime_seconds?: number | null
          started_at?: string | null
          state?: string
          task_id?: string
          task_name?: string
          traceback?: string | null
          updated_at?: string | null
          user_id?: string | null
          worker?: string | null
        }
        Relationships: []
      }
      concepts: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description: string | null
          name: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          name: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      course_workspaces: {
        Row: {
          course_context: Json | null
          created_at: string | null
          curriculum_id: number | null
          description: string | null
          id: number
          knowledge_tree_id: number | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_context?: Json | null
          created_at?: string | null
          curriculum_id?: number | null
          description?: string | null
          id?: number
          knowledge_tree_id?: number | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_context?: Json | null
          created_at?: string | null
          curriculum_id?: number | null
          description?: string | null
          id?: number
          knowledge_tree_id?: number | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_workspaces_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_workspaces_knowledge_tree_id_fkey"
            columns: ["knowledge_tree_id"]
            isOneToOne: false
            referencedRelation: "knowledge_trees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curricula: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: number
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      curriculum_lessons: {
        Row: {
          activities_json: Json
          created_at: string
          curriculum_id: number
          display_order: number | null
          id: number
          lesson_code: string
          lesson_name: string
          module_code: string | null
          module_name: string | null
          unit_code: string | null
          unit_name: string | null
        }
        Insert: {
          activities_json: Json
          created_at?: string
          curriculum_id: number
          display_order?: number | null
          id?: number
          lesson_code: string
          lesson_name: string
          module_code?: string | null
          module_name?: string | null
          unit_code?: string | null
          unit_name?: string | null
        }
        Update: {
          activities_json?: Json
          created_at?: string
          curriculum_id?: number
          display_order?: number | null
          id?: number
          lesson_code?: string
          lesson_name?: string
          module_code?: string | null
          module_name?: string | null
          unit_code?: string | null
          unit_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_lessons_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_modules: {
        Row: {
          approach: string
          context: Json | null
          created_at: string | null
          id: number
          module_code: string
          module_name: string
          unit_id: number
          updated_at: string | null
        }
        Insert: {
          approach: string
          context?: Json | null
          created_at?: string | null
          id?: number
          module_code: string
          module_name: string
          unit_id: number
          updated_at?: string | null
        }
        Update: {
          approach?: string
          context?: Json | null
          created_at?: string | null
          id?: number
          module_code?: string
          module_name?: string
          unit_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_modules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "curriculum_units_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_units: {
        Row: {
          created_at: string
          curriculum_id: number
          display_order: number | null
          id: number
          module_code: string | null
          module_name: string | null
          unit_code: string
          unit_name: string
        }
        Insert: {
          created_at?: string
          curriculum_id: number
          display_order?: number | null
          id?: number
          module_code?: string | null
          module_name?: string | null
          unit_code: string
          unit_name: string
        }
        Update: {
          created_at?: string
          curriculum_id?: number
          display_order?: number | null
          id?: number
          module_code?: string | null
          module_name?: string | null
          unit_code?: string
          unit_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_units_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_units_v2: {
        Row: {
          context: Json | null
          created_at: string | null
          id: number
          unit_code: string
          unit_name: string
          updated_at: string | null
          workspace_id: number
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: number
          unit_code: string
          unit_name: string
          updated_at?: string | null
          workspace_id: number
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: number
          unit_code?: string
          unit_name?: string
          updated_at?: string | null
          workspace_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_units_v2_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "course_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_components: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          hub_asset_id: string | null
          id: string
          is_public: boolean | null
          mock_data: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hub_asset_id?: string | null
          id?: string
          is_public?: boolean | null
          mock_data?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hub_asset_id?: string | null
          id?: string
          is_public?: boolean | null
          mock_data?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_components_hub_asset_id_fkey"
            columns: ["hub_asset_id"]
            isOneToOne: false
            referencedRelation: "hub_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_assets: {
        Row: {
          asset_type: string
          content: Json
          created_at: string
          creator_id: string | null
          description: string | null
          id: string
          install_count: number
          is_hidden: boolean
          is_public: boolean
          license: string
          parent_asset_id: string | null
          price_cents: number
          published_at: string | null
          ref_id: string
          remix_depth: number
          slug: string
          source_asset_id: string | null
          star_count: number
          stripe_product_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          content?: Json
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          install_count?: number
          is_hidden?: boolean
          is_public?: boolean
          license?: string
          parent_asset_id?: string | null
          price_cents?: number
          published_at?: string | null
          ref_id: string
          remix_depth?: number
          slug: string
          source_asset_id?: string | null
          star_count?: number
          stripe_product_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          content?: Json
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          install_count?: number
          is_hidden?: boolean
          is_public?: boolean
          license?: string
          parent_asset_id?: string | null
          price_cents?: number
          published_at?: string | null
          ref_id?: string
          remix_depth?: number
          slug?: string
          source_asset_id?: string | null
          star_count?: number
          stripe_product_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_assets_parent_asset_id_fkey"
            columns: ["parent_asset_id"]
            isOneToOne: false
            referencedRelation: "hub_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_assets_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "hub_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_reports: {
        Row: {
          asset_id: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          resolved: boolean
          resolved_by: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          resolved?: boolean
          resolved_by?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          resolved?: boolean
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_reports_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hub_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_stars: {
        Row: {
          asset_id: string
          starred_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          starred_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          starred_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_stars_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hub_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          name?: string
        }
        Relationships: []
      }
      knowledge_fields: {
        Row: {
          code: string
          created_at: string | null
          cs2023_ka_mapping: string | null
          description: string | null
          display_order: number | null
          keywords: string[] | null
          meta_data: Json | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          cs2023_ka_mapping?: string | null
          description?: string | null
          display_order?: number | null
          keywords?: string[] | null
          meta_data?: Json | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          cs2023_ka_mapping?: string | null
          description?: string | null
          display_order?: number | null
          keywords?: string[] | null
          meta_data?: Json | null
          name?: string
        }
        Relationships: []
      }
      knowledge_subjects: {
        Row: {
          code: string
          created_at: string | null
          cs2023_ka_mapping: string | null
          description: string | null
          keywords: string[] | null
          meta_data: Json | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          cs2023_ka_mapping?: string | null
          description?: string | null
          keywords?: string[] | null
          meta_data?: Json | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          cs2023_ka_mapping?: string | null
          description?: string | null
          keywords?: string[] | null
          meta_data?: Json | null
          name?: string
        }
        Relationships: []
      }
      knowledge_topics: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          name?: string
        }
        Relationships: []
      }
      knowledge_trees: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
          version: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          version?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          version?: string | null
        }
        Relationships: []
      }
      lab_orchestrator_configs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          hub_asset_id: string | null
          id: string
          input_mapping: Json | null
          is_public: boolean | null
          n8n_workflow_id: string | null
          name: string
          steps: Json
          tags: string[] | null
          updated_at: string | null
          viewport: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hub_asset_id?: string | null
          id?: string
          input_mapping?: Json | null
          is_public?: boolean | null
          n8n_workflow_id?: string | null
          name: string
          steps: Json
          tags?: string[] | null
          updated_at?: string | null
          viewport?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hub_asset_id?: string | null
          id?: string
          input_mapping?: Json | null
          is_public?: boolean | null
          n8n_workflow_id?: string | null
          name?: string
          steps?: Json
          tags?: string[] | null
          updated_at?: string | null
          viewport?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_orchestrator_configs_hub_asset_id_fkey"
            columns: ["hub_asset_id"]
            isOneToOne: false
            referencedRelation: "hub_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_objective_concepts: {
        Row: {
          concept_code: string
          created_at: string | null
          lo_code: string
        }
        Insert: {
          concept_code: string
          created_at?: string | null
          lo_code: string
        }
        Update: {
          concept_code?: string
          created_at?: string | null
          lo_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_objective_concepts_concept_code_fkey"
            columns: ["concept_code"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "learning_objective_concepts_lo_code_fkey"
            columns: ["lo_code"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["code"]
          },
        ]
      }
      learning_objectives: {
        Row: {
          code: string
          concept_codes: string[] | null
          created_at: string | null
          description: string | null
          lo_type: string
          name: string
          parent_lo_code: string | null
        }
        Insert: {
          code: string
          concept_codes?: string[] | null
          created_at?: string | null
          description?: string | null
          lo_type: string
          name: string
          parent_lo_code?: string | null
        }
        Update: {
          code?: string
          concept_codes?: string[] | null
          created_at?: string | null
          description?: string | null
          lo_type?: string
          name?: string
          parent_lo_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_objectives_parent_lo_code_fkey"
            columns: ["parent_lo_code"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["code"]
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
          runner_type: string
          timeout_seconds: number | null
          workflow_file: string | null
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
          runner_type?: string
          timeout_seconds?: number | null
          workflow_file?: string | null
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
          runner_type?: string
          timeout_seconds?: number | null
          workflow_file?: string | null
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
          custom_component_id: string | null
          default_ai_settings: Json | null
          description: string | null
          hub_asset_id: string | null
          id: string
          input_schema: Json | null
          is_active: boolean | null
          is_public: boolean | null
          name: string
          next_stage_template_id: string | null
          next_stage_template_ids: Json | null
          organization_code: string | null
          output_schema: Json | null
          requires_approval: boolean | null
          stage_config: Json | null
          stage_key: string | null
          template: string
          updated_at: string | null
          version: number | null
          view_config: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custom_component_id?: string | null
          default_ai_settings?: Json | null
          description?: string | null
          hub_asset_id?: string | null
          id: string
          input_schema?: Json | null
          is_active?: boolean | null
          is_public?: boolean | null
          name: string
          next_stage_template_id?: string | null
          next_stage_template_ids?: Json | null
          organization_code?: string | null
          output_schema?: Json | null
          requires_approval?: boolean | null
          stage_config?: Json | null
          stage_key?: string | null
          template: string
          updated_at?: string | null
          version?: number | null
          view_config?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custom_component_id?: string | null
          default_ai_settings?: Json | null
          description?: string | null
          hub_asset_id?: string | null
          id?: string
          input_schema?: Json | null
          is_active?: boolean | null
          is_public?: boolean | null
          name?: string
          next_stage_template_id?: string | null
          next_stage_template_ids?: Json | null
          organization_code?: string | null
          output_schema?: Json | null
          requires_approval?: boolean | null
          stage_config?: Json | null
          stage_key?: string | null
          template?: string
          updated_at?: string | null
          version?: number | null
          view_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_custom_component_id_fkey"
            columns: ["custom_component_id"]
            isOneToOne: false
            referencedRelation: "custom_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_templates_hub_asset_id_fkey"
            columns: ["hub_asset_id"]
            isOneToOne: false
            referencedRelation: "hub_assets"
            referencedColumns: ["id"]
          },
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
          lobster_token: string | null
          n8n_execution_id: string | null
          output_data: Json | null
          retry_count: number | null
          started_at: string | null
          status: string | null
          step_id: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          lobster_token?: string | null
          n8n_execution_id?: string | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          step_id: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          lobster_token?: string | null
          n8n_execution_id?: string | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          step_id?: string
          user_id?: string | null
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
      subject_fields: {
        Row: {
          created_at: string | null
          field_code: string
          is_primary: number | null
          subject_code: string
        }
        Insert: {
          created_at?: string | null
          field_code: string
          is_primary?: number | null
          subject_code: string
        }
        Update: {
          created_at?: string | null
          field_code?: string
          is_primary?: number | null
          subject_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_fields_field_code_fkey"
            columns: ["field_code"]
            isOneToOne: false
            referencedRelation: "knowledge_fields"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "subject_fields_subject_code_fkey"
            columns: ["subject_code"]
            isOneToOne: false
            referencedRelation: "knowledge_subjects"
            referencedColumns: ["code"]
          },
        ]
      }
      system_prompt_history: {
        Row: {
          created_at: string | null
          edited_by: string
          id: string
          override_id: string | null
          override_template: string
          prompt_key: string
        }
        Insert: {
          created_at?: string | null
          edited_by: string
          id: string
          override_id?: string | null
          override_template: string
          prompt_key: string
        }
        Update: {
          created_at?: string | null
          edited_by?: string
          id?: string
          override_id?: string | null
          override_template?: string
          prompt_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_prompt_history_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_prompt_history_override_id_fkey"
            columns: ["override_id"]
            isOneToOne: false
            referencedRelation: "system_prompt_overrides"
            referencedColumns: ["id"]
          },
        ]
      }
      system_prompt_overrides: {
        Row: {
          created_at: string | null
          edited_by: string
          id: string
          override_template: string
          prompt_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          edited_by: string
          id: string
          override_template: string
          prompt_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          edited_by?: string
          id?: string
          override_template?: string
          prompt_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_prompt_overrides_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_batches: {
        Row: {
          batch_type: string | null
          completed_at: string | null
          completed_tasks: number
          config: Json | null
          created_at: string | null
          created_by: string | null
          exam_round_code: string | null
          failed_tasks: number
          finished_tasks: number | null
          grade_code: string | null
          id: string
          is_public: boolean | null
          launch_id: string | null
          n8n_execution_id: string | null
          n8n_workflow_id: string | null
          name: string
          orchestrator_config_id: string | null
          pending_tasks: number
          preset_key: string | null
          processing_tasks: number
          source_file: string | null
          started_at: string | null
          status: string
          total_tasks: number
          updated_at: string | null
          week_range: string | null
        }
        Insert: {
          batch_type?: string | null
          completed_at?: string | null
          completed_tasks?: number
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          exam_round_code?: string | null
          failed_tasks?: number
          finished_tasks?: number | null
          grade_code?: string | null
          id?: string
          is_public?: boolean | null
          launch_id?: string | null
          n8n_execution_id?: string | null
          n8n_workflow_id?: string | null
          name: string
          orchestrator_config_id?: string | null
          pending_tasks?: number
          preset_key?: string | null
          processing_tasks?: number
          source_file?: string | null
          started_at?: string | null
          status?: string
          total_tasks?: number
          updated_at?: string | null
          week_range?: string | null
        }
        Update: {
          batch_type?: string | null
          completed_at?: string | null
          completed_tasks?: number
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          exam_round_code?: string | null
          failed_tasks?: number
          finished_tasks?: number | null
          grade_code?: string | null
          id?: string
          is_public?: boolean | null
          launch_id?: string | null
          n8n_execution_id?: string | null
          n8n_workflow_id?: string | null
          name?: string
          orchestrator_config_id?: string | null
          pending_tasks?: number
          preset_key?: string | null
          processing_tasks?: number
          source_file?: string | null
          started_at?: string | null
          status?: string
          total_tasks?: number
          updated_at?: string | null
          week_range?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_batches_orchestrator_config_id_fkey"
            columns: ["orchestrator_config_id"]
            isOneToOne: false
            referencedRelation: "lab_orchestrator_configs"
            referencedColumns: ["id"]
          },
        ]
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
      topic_categories: {
        Row: {
          category_code: string
          created_at: string | null
          topic_code: string
        }
        Insert: {
          category_code: string
          created_at?: string | null
          topic_code: string
        }
        Update: {
          category_code?: string
          created_at?: string | null
          topic_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_categories_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "knowledge_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "topic_categories_topic_code_fkey"
            columns: ["topic_code"]
            isOneToOne: false
            referencedRelation: "knowledge_topics"
            referencedColumns: ["code"]
          },
        ]
      }
      topic_learning_objectives: {
        Row: {
          created_at: string | null
          lo_code: string
          topic_code: string
        }
        Insert: {
          created_at?: string | null
          lo_code: string
          topic_code: string
        }
        Update: {
          created_at?: string | null
          lo_code?: string
          topic_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_learning_objectives_lo_code_fkey"
            columns: ["lo_code"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "topic_learning_objectives_topic_code_fkey"
            columns: ["topic_code"]
            isOneToOne: false
            referencedRelation: "knowledge_topics"
            referencedColumns: ["code"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          api_key_encrypted: string
          created_at: string
          id: string
          is_active: boolean
          key_name: string
          model_preference: string
          pool_type: Database["public"]["Enums"]["api_key_pool_type"] | null
          priority: number
          thinking_mode_enabled: boolean
          thinking_token_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          key_name: string
          model_preference?: string
          pool_type?: Database["public"]["Enums"]["api_key_pool_type"] | null
          priority?: number
          thinking_mode_enabled?: boolean
          thinking_token_limit?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key_name?: string
          model_preference?: string
          pool_type?: Database["public"]["Enums"]["api_key_pool_type"] | null
          priority?: number
          thinking_mode_enabled?: boolean
          thinking_token_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_generated_resources: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          resource_type: string
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at: string
          id: string
          metadata?: Json | null
          resource_type: string
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_generated_resources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          tier: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at: string
          email: string
          full_name?: string | null
          id: string
          role?: string
          settings?: Json | null
          tier?: string | null
          updated_at: string
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
          tier?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      user_prompt_customizations: {
        Row: {
          created_at: string | null
          custom_template: string
          id: string
          is_active: boolean | null
          prompt_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_template: string
          id?: string
          is_active?: boolean | null
          prompt_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_template?: string
          id?: string
          is_active?: boolean | null
          prompt_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_prompt_customizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_resources: {
        Row: {
          content: string | null
          created_at: string
          metadata_json: Json | null
          resource_code: string
          resource_id: string
          supabase_path: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at: string
          metadata_json?: Json | null
          resource_code: string
          resource_id: string
          supabase_path: string
          title?: string | null
          updated_at: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          metadata_json?: Json | null
          resource_code?: string
          resource_id?: string
          supabase_path?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_resources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          id: string
          month: string
          task_count: number | null
          token_input_count: number | null
          token_output_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          month: string
          task_count?: number | null
          token_input_count?: number | null
          token_output_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          month?: string
          task_count?: number | null
          token_input_count?: number | null
          token_output_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workflow_edit_locks: {
        Row: {
          entity_id: string
          entity_type: string
          expires_at: string
          lock_id: string
          locked_at: string | null
          locked_by: string
          locked_by_id: string | null
        }
        Insert: {
          entity_id: string
          entity_type: string
          expires_at: string
          lock_id: string
          locked_at?: string | null
          locked_by: string
          locked_by_id?: string | null
        }
        Update: {
          entity_id?: string
          entity_type?: string
          expires_at?: string
          lock_id?: string
          locked_at?: string | null
          locked_by?: string
          locked_by_id?: string | null
        }
        Relationships: []
      }
      workflow_errors: {
        Row: {
          context_json: Json | null
          created_at: string | null
          error_id: string
          error_message: string
          error_type: string
          job_id: string
          phase: string
          user_id: string | null
        }
        Insert: {
          context_json?: Json | null
          created_at?: string | null
          error_id: string
          error_message: string
          error_type: string
          job_id: string
          phase: string
          user_id?: string | null
        }
        Update: {
          context_json?: Json | null
          created_at?: string | null
          error_id?: string
          error_message?: string
          error_type?: string
          job_id?: string
          phase?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "workflow_jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      workflow_jobs: {
        Row: {
          api_key_encrypted: string | null
          celery_task_id: string | null
          coherence_reports: Json | null
          course_config: Json
          created_at: string | null
          discovery_context: Json | null
          job_id: string
          n8n_execution_id: string | null
          n8n_workflow_id: string | null
          package_url: string | null
          readiness_status: Json | null
          resource_list: Json | null
          selected_resources: Json | null
          state: string
          student_guide: string | null
          task_id: string | null
          teacher_guide: string | null
          updated_at: string | null
          use_n8n: boolean | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          celery_task_id?: string | null
          coherence_reports?: Json | null
          course_config: Json
          created_at?: string | null
          discovery_context?: Json | null
          job_id: string
          n8n_execution_id?: string | null
          n8n_workflow_id?: string | null
          package_url?: string | null
          readiness_status?: Json | null
          resource_list?: Json | null
          selected_resources?: Json | null
          state: string
          student_guide?: string | null
          task_id?: string | null
          teacher_guide?: string | null
          updated_at?: string | null
          use_n8n?: boolean | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          celery_task_id?: string | null
          coherence_reports?: Json | null
          course_config?: Json
          created_at?: string | null
          discovery_context?: Json | null
          job_id?: string
          n8n_execution_id?: string | null
          n8n_workflow_id?: string | null
          package_url?: string | null
          readiness_status?: Json | null
          resource_list?: Json | null
          selected_resources?: Json | null
          state?: string
          student_guide?: string | null
          task_id?: string | null
          teacher_guide?: string | null
          updated_at?: string | null
          use_n8n?: boolean | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_workflow_jobs_task_id"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "workflow_tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      workflow_progress: {
        Row: {
          completed_items: number | null
          job_id: string
          phase: string
          progress_id: string
          progress_percentage: number | null
          status: string | null
          total_items: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_items?: number | null
          job_id: string
          phase: string
          progress_id: string
          progress_percentage?: number | null
          status?: string | null
          total_items: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_items?: number | null
          job_id?: string
          phase?: string
          progress_id?: string
          progress_percentage?: number | null
          status?: string | null
          total_items?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_progress_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "workflow_jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      workflow_registry: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          n8n_workflow_id: string
          registry_id: string
          synced_at: string | null
          task_id: string | null
          updated_at: string | null
          webhook_path: string | null
          workflow_description: string | null
          workflow_name: string
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean | null
          n8n_workflow_id: string
          registry_id?: string
          synced_at?: string | null
          task_id?: string | null
          updated_at?: string | null
          webhook_path?: string | null
          workflow_description?: string | null
          workflow_name: string
        }
        Update: {
          created_at?: string | null
          is_active?: boolean | null
          n8n_workflow_id?: string
          registry_id?: string
          synced_at?: string | null
          task_id?: string | null
          updated_at?: string | null
          webhook_path?: string | null
          workflow_description?: string | null
          workflow_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_registry_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "workflow_tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      workflow_resource_specs: {
        Row: {
          created_at: string | null
          job_id: string
          learning_objective_codes: string[] | null
          review_notes: string | null
          spec_content: Json
          spec_id: string
          status: string | null
          unit_index: number
          updated_at: string | null
          user_id: string | null
          validation_errors: Json | null
          validation_score: number | null
          validation_warnings: Json | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          job_id: string
          learning_objective_codes?: string[] | null
          review_notes?: string | null
          spec_content: Json
          spec_id: string
          status?: string | null
          unit_index: number
          updated_at?: string | null
          user_id?: string | null
          validation_errors?: Json | null
          validation_score?: number | null
          validation_warnings?: Json | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          job_id?: string
          learning_objective_codes?: string[] | null
          review_notes?: string | null
          spec_content?: Json
          spec_id?: string
          status?: string | null
          unit_index?: number
          updated_at?: string | null
          user_id?: string | null
          validation_errors?: Json | null
          validation_score?: number | null
          validation_warnings?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_resource_specs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "workflow_jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      workflow_resources: {
        Row: {
          content: Json | null
          created_at: string | null
          file_path: string | null
          job_id: string
          lesson_id: string
          metadata_json: Json | null
          resource_id: string
          resource_type: string
          status: string | null
          unit_index: number
          user_id: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          file_path?: string | null
          job_id: string
          lesson_id: string
          metadata_json?: Json | null
          resource_id: string
          resource_type: string
          status?: string | null
          unit_index: number
          user_id?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          file_path?: string | null
          job_id?: string
          lesson_id?: string
          metadata_json?: Json | null
          resource_id?: string
          resource_type?: string
          status?: string | null
          unit_index?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_resources_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "workflow_jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      workflow_syllabi: {
        Row: {
          approach: string
          content: string
          created_at: string | null
          job_id: string
          review_notes: string | null
          status: string | null
          syllabus_id: string
          unit_index: number
          unit_name: string
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          approach: string
          content: string
          created_at?: string | null
          job_id: string
          review_notes?: string | null
          status?: string | null
          syllabus_id: string
          unit_index: number
          unit_name: string
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          approach?: string
          content?: string
          created_at?: string | null
          job_id?: string
          review_notes?: string | null
          status?: string | null
          syllabus_id?: string
          unit_index?: number
          unit_name?: string
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_syllabi_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "workflow_jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          created_at: string | null
          created_by: string | null
          icon_name: string | null
          is_system: boolean | null
          task_description: string | null
          task_id: string
          task_key: string
          task_name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          icon_name?: string | null
          is_system?: boolean | null
          task_description?: string | null
          task_id?: string
          task_key: string
          task_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          icon_name?: string | null
          is_system?: boolean | null
          task_description?: string | null
          task_id?: string
          task_key?: string
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_versions: {
        Row: {
          change_notes: string | null
          content: string
          created_at: string | null
          created_by: string | null
          entity_id: string
          entity_type: string
          is_approved: boolean | null
          version_id: string
          version_number: number
        }
        Insert: {
          change_notes?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          entity_id: string
          entity_type: string
          is_approved?: boolean | null
          version_id: string
          version_number: number
        }
        Update: {
          change_notes?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          is_approved?: boolean | null
          version_id?: string
          version_number?: number
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
          launch_id: string | null
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
          status: Database["public"]["Enums"]["ai_task_status"] | null
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
            foreignKeyName: "ai_tasks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "task_batches"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_stuck_tasks"
            referencedColumns: ["task_id"]
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
            referencedRelation: "v_stuck_tasks"
            referencedColumns: ["task_id"]
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
        Relationships: [
          {
            foreignKeyName: "ai_tasks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "task_batches"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "ai_tasks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "task_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      v_runnable_tasks: {
        Row: {
          agent_id: string | null
          ai_settings: Json | null
          batch_id: string | null
          batch_name: string | null
          batch_priority: string | null
          batch_status: string | null
          created_at: string | null
          extra: Json | null
          hierarchy_path: Json | null
          id: string | null
          input_data: Json | null
          launch_id: string | null
          lo_code: string | null
          model_id: string | null
          next_stage_template_id: Json | null
          next_stage_template_ids: Json | null
          next_task_config: Json | null
          orchestrator_execution_id: string | null
          parent_task_id: string | null
          phase_code: string | null
          prompt_template_id: string | null
          requires_approval: boolean | null
          retry_count: number | null
          root_task_id: string | null
          sequence: number | null
          split_group_id: string | null
          stage_key: string | null
          status: Database["public"]["Enums"]["ai_task_status"] | null
          step_execution_id: string | null
          step_id: string | null
          step_number: number | null
          task_type: string | null
          temperature: number | null
          test_mode: boolean | null
          total_steps: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "task_batches"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_stuck_tasks"
            referencedColumns: ["task_id"]
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
            referencedRelation: "v_stuck_tasks"
            referencedColumns: ["task_id"]
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
      v_stuck_tasks: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          created_at: string | null
          error_message: string | null
          failed_at: string | null
          grade_code: string | null
          lo_code: string | null
          phase_code: string | null
          retry_count: number | null
          task_id: string | null
          task_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "task_batches"
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
          status: Database["public"]["Enums"]["ai_task_status"] | null
          total_steps: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "task_batches"
            referencedColumns: ["id"]
          },
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
          launch_id: string | null
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
          status: Database["public"]["Enums"]["ai_task_status"]
          step_execution_id: string | null
          step_id: string | null
          step_number: number | null
          task_type: string
          test_mode: boolean | null
          total_steps: number | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ai_tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_expired_locks: { Args: never; Returns: undefined }
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
      decrement_star_count: { Args: { p_asset_id: string }; Returns: undefined }
      delete_batch_cascade: { Args: { p_batch_id: string }; Returns: undefined }
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
      get_my_role: { Args: never; Returns: string }
      get_my_tier: { Args: never; Returns: string }
      get_user_usage: {
        Args: { p_user_id: string }
        Returns: {
          month: string
          task_count: number
          token_input_count: number
          token_output_count: number
        }[]
      }
      increment_finished_task:
        | {
            Args: { p_batch_id: string; p_task_id: string }
            Returns: {
              finished_count: number
              is_last_task: boolean
              total_count: number
            }[]
          }
        | {
            Args: {
              p_batch_id: string
              p_output_result?: Json
              p_task_id: string
            }
            Returns: {
              finished_count: number
              is_last_task: boolean
              total_count: number
            }[]
          }
      increment_star_count: { Args: { p_asset_id: string }; Returns: undefined }
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
      increment_user_usage: {
        Args: {
          p_input_tokens?: number
          p_output_tokens?: number
          p_tasks?: number
          p_user_id: string
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      mark_zombie_tasks: { Args: never; Returns: undefined }
      regenerate_task: { Args: { p_task_id: string }; Returns: string }
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
      retry_all_failed_in_batch: {
        Args: { p_batch_id: string }
        Returns: number
      }
      retry_failed_task: { Args: { p_task_id: string }; Returns: undefined }
    }
    Enums: {
      ai_task_status:
        | "plan"
        | "pending"
        | "running"
        | "processing"
        | "awaiting_approval"
        | "approved"
        | "completed"
        | "generated"
        | "failed"
        | "cancelled"
        | "skipped"
      api_key_pool_type: "personal" | "free_pool" | "premium_pool"
      user_role: "user" | "admin" | "superadmin"
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
    Enums: {
      ai_task_status: [
        "plan",
        "pending",
        "running",
        "processing",
        "awaiting_approval",
        "approved",
        "completed",
        "generated",
        "failed",
        "cancelled",
        "skipped",
      ],
      api_key_pool_type: ["personal", "free_pool", "premium_pool"],
      user_role: ["user", "admin", "superadmin"],
    },
  },
} as const

