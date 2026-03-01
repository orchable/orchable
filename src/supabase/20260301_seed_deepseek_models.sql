-- Migration: Add DeepSeek models to ai_model_settings
-- Description: Adds DeepSeek Chat and Reasoner models with metadata.
-- Requirement: Ensure 20260301_fix_ai_model_settings_schema.sql is run first!

INSERT INTO public.ai_model_settings (
    model_id, name, provider, category, tagline, description,
    supported_inputs, supported_outputs, input_token_limit, output_token_limit,
    capabilities, thinking_config_type, recommended_thinking,
    temperature, top_p, top_k, max_output_tokens,
    free_tier_rpm, free_tier_tpm, free_tier_rpd,
    use_case_tags, timeout_ms, retries, is_active
) VALUES (
    'deepseek-chat',
    'DeepSeek Chat',
    'deepseek',
    'DeepSeek V3',
    'High-performance general purpose model',
    'DeepSeek-V3 is a strong Mixture-of-Experts (MoE) language model. Suitable for general chat, coding, and reasoning tasks.',
    '["Text"]'::jsonb,
    '["Text"]'::jsonb,
    65536, 8192,
    '{"audio_generation":false,"batch_api":false,"caching":false,"code_execution":false,"file_search":false,"function_calling":true,"image_generation":false,"live_api":false,"search_grounding":false,"structured_outputs":true,"thinking":false,"url_context":false}'::jsonb,
    'none', NULL,
    1.0, 0.9, 40, 8192,
    NULL, NULL, NULL, -- BYOK only for now
    '["content-gen","summarization","analysis","coding"]'::jsonb,
    300000, 3, true
), (
    'deepseek-reasoner',
    'DeepSeek Reasoner',
    'deepseek',
    'DeepSeek R1',
    'Advanced reasoning model for complex logical tasks',
    'DeepSeek-R1 is a reasoning model trained with reinforcement learning. It excels at math, code, and complex logical reasoning.',
    '["Text"]'::jsonb,
    '["Text"]'::jsonb,
    65536, 8192,
    '{"audio_generation":false,"batch_api":false,"caching":false,"code_execution":false,"file_search":false,"function_calling":false,"image_generation":false,"live_api":false,"search_grounding":false,"structured_outputs":false,"thinking":true,"url_context":false}'::jsonb,
    'none', NULL,
    1.0, 0.9, 40, 8192,
    NULL, NULL, NULL, -- BYOK only for now
    '["complex-reasoning","math","coding"]'::jsonb,
    600000, 3, true
) ON CONFLICT (model_id) WHERE user_id IS NULL DO UPDATE SET
    provider = EXCLUDED.provider,
    category = EXCLUDED.category,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    supported_inputs = EXCLUDED.supported_inputs,
    supported_outputs = EXCLUDED.supported_outputs,
    input_token_limit = EXCLUDED.input_token_limit,
    output_token_limit = EXCLUDED.output_token_limit,
    capabilities = EXCLUDED.capabilities,
    thinking_config_type = EXCLUDED.thinking_config_type,
    max_output_tokens = EXCLUDED.max_output_tokens,
    use_case_tags = EXCLUDED.use_case_tags;
