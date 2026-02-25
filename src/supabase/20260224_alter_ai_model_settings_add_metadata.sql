-- Migration: Add rich metadata columns to ai_model_settings
-- Description: Adds model capability metadata from Gemini Model Guide + Free Tier status from Free Tier Guide.

-- Add metadata columns
ALTER TABLE public.ai_model_settings
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS tagline TEXT,
    ADD COLUMN IF NOT EXISTS supported_inputs JSONB DEFAULT '["Text"]'::jsonb,
    ADD COLUMN IF NOT EXISTS supported_outputs JSONB DEFAULT '["Text"]'::jsonb,
    ADD COLUMN IF NOT EXISTS input_token_limit INTEGER DEFAULT 1048576,
    ADD COLUMN IF NOT EXISTS output_token_limit INTEGER DEFAULT 65536,
    ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS thinking_config_type TEXT DEFAULT 'none', -- 'level' | 'budget' | 'none'
    ADD COLUMN IF NOT EXISTS recommended_thinking TEXT DEFAULT NULL,   -- e.g. 'high' or '2048'
    ADD COLUMN IF NOT EXISTS free_tier_rpm INTEGER DEFAULT NULL,        -- null = paid-only
    ADD COLUMN IF NOT EXISTS free_tier_tpm INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS free_tier_rpd INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS use_case_tags JSONB DEFAULT '[]'::jsonb;

-- Remove old placeholder seed data and re-seed with full metadata
DELETE FROM public.ai_model_settings WHERE model_id IN ('gemini-flash-latest', 'gemini-pro-latest');

-- =============================================
-- SEED: Gemini 2.5 Flash
-- =============================================
INSERT INTO public.ai_model_settings (
    model_id, name, category, tagline, description,
    supported_inputs, supported_outputs, input_token_limit, output_token_limit,
    capabilities, thinking_config_type, recommended_thinking,
    temperature, top_p, top_k, max_output_tokens,
    free_tier_rpm, free_tier_tpm, free_tier_rpd,
    use_case_tags, timeout_ms, retries, is_active
) VALUES (
    'gemini-2.5-flash',
    'Gemini 2.5 Flash',
    'Gemini 2.5 Flash',
    'Best price-performance model, ideal for large scale, low-latency, and agentic tasks',
    'Primary worker agent for the majority of content generation, analysis, and summarization tasks. Use medium thinking for balanced quality and quota usage.',
    '["Text","Image","Video","Audio"]'::jsonb,
    '["Text"]'::jsonb,
    1048576, 65536,
    '{"audio_generation":false,"batch_api":true,"caching":true,"code_execution":true,"file_search":true,"function_calling":true,"image_generation":false,"live_api":false,"search_grounding":true,"structured_outputs":true,"thinking":true,"url_context":true}'::jsonb,
    'budget', '2048',
    1.0, 0.95, 40, 65536,
    5, 250000, 20,
    '["content-gen","summarization","analysis","agentic"]'::jsonb,
    300000, 3, true
) ON CONFLICT (model_id) DO UPDATE SET
    category = EXCLUDED.category,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    supported_inputs = EXCLUDED.supported_inputs,
    supported_outputs = EXCLUDED.supported_outputs,
    input_token_limit = EXCLUDED.input_token_limit,
    output_token_limit = EXCLUDED.output_token_limit,
    capabilities = EXCLUDED.capabilities,
    thinking_config_type = EXCLUDED.thinking_config_type,
    recommended_thinking = EXCLUDED.recommended_thinking,
    max_output_tokens = EXCLUDED.max_output_tokens,
    free_tier_rpm = EXCLUDED.free_tier_rpm,
    free_tier_tpm = EXCLUDED.free_tier_tpm,
    free_tier_rpd = EXCLUDED.free_tier_rpd,
    use_case_tags = EXCLUDED.use_case_tags;

-- =============================================
-- SEED: Gemini 2.5 Flash-Lite
-- =============================================
INSERT INTO public.ai_model_settings (
    model_id, name, category, tagline, description,
    supported_inputs, supported_outputs, input_token_limit, output_token_limit,
    capabilities, thinking_config_type, recommended_thinking,
    temperature, top_p, top_k, max_output_tokens,
    free_tier_rpm, free_tier_tpm, free_tier_rpd,
    use_case_tags, timeout_ms, retries, is_active
) VALUES (
    'gemini-2.5-flash-lite',
    'Gemini 2.5 Flash-Lite',
    'Gemini 2.5 Flash-Lite',
    'Fastest flash model optimized for cost-efficiency and high throughput',
    'Best for high-volume tasks: classification, routing, filtering, translation, and simple extraction. Set thinking budget to 0 for maximum throughput. Double the RPM of standard Flash models.',
    '["Text","Image","Video","Audio","PDF"]'::jsonb,
    '["Text"]'::jsonb,
    1048576, 65536,
    '{"audio_generation":false,"batch_api":true,"caching":true,"code_execution":true,"file_search":true,"function_calling":true,"image_generation":false,"live_api":false,"search_grounding":true,"structured_outputs":true,"thinking":true,"url_context":true}'::jsonb,
    'budget', '0',
    1.0, 0.95, 40, 65536,
    10, 250000, 20,
    '["classification","routing","translation","filtering","high-volume"]'::jsonb,
    120000, 3, true
) ON CONFLICT (model_id) DO UPDATE SET
    category = EXCLUDED.category,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    supported_inputs = EXCLUDED.supported_inputs,
    supported_outputs = EXCLUDED.supported_outputs,
    input_token_limit = EXCLUDED.input_token_limit,
    output_token_limit = EXCLUDED.output_token_limit,
    capabilities = EXCLUDED.capabilities,
    thinking_config_type = EXCLUDED.thinking_config_type,
    recommended_thinking = EXCLUDED.recommended_thinking,
    max_output_tokens = EXCLUDED.max_output_tokens,
    free_tier_rpm = EXCLUDED.free_tier_rpm,
    free_tier_tpm = EXCLUDED.free_tier_tpm,
    free_tier_rpd = EXCLUDED.free_tier_rpd,
    use_case_tags = EXCLUDED.use_case_tags;

-- =============================================
-- SEED: Gemini 3 Flash Preview
-- =============================================
INSERT INTO public.ai_model_settings (
    model_id, name, category, tagline, description,
    supported_inputs, supported_outputs, input_token_limit, output_token_limit,
    capabilities, thinking_config_type, recommended_thinking,
    temperature, top_p, top_k, max_output_tokens,
    free_tier_rpm, free_tier_tpm, free_tier_rpd,
    use_case_tags, timeout_ms, retries, is_active
) VALUES (
    'gemini-3-flash-preview',
    'Gemini 3 Flash Preview',
    'Gemini 3 Flash',
    'Most balanced model built for speed, scale, and frontier intelligence',
    'Best overall for Free Tier. Use as root planner and orchestrator in multi-agent pipelines. Outperforms Gemini 2.5 Pro on most benchmarks. Set thinking to "high" for complex reasoning tasks. Only 20 RPD — reserve for high-value stages.',
    '["Text","Image","Video","Audio","PDF"]'::jsonb,
    '["Text"]'::jsonb,
    1048576, 65536,
    '{"audio_generation":false,"batch_api":true,"caching":true,"code_execution":true,"file_search":true,"function_calling":true,"image_generation":false,"live_api":false,"search_grounding":true,"structured_outputs":true,"thinking":true,"url_context":true}'::jsonb,
    'level', 'high',
    1.0, 0.95, 40, 65536,
    5, 250000, 20,
    '["orchestrator","complex-reasoning","agentic-coding","planning"]'::jsonb,
    300000, 3, false
) ON CONFLICT (model_id) DO UPDATE SET
    category = EXCLUDED.category,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    supported_inputs = EXCLUDED.supported_inputs,
    supported_outputs = EXCLUDED.supported_outputs,
    input_token_limit = EXCLUDED.input_token_limit,
    output_token_limit = EXCLUDED.output_token_limit,
    capabilities = EXCLUDED.capabilities,
    thinking_config_type = EXCLUDED.thinking_config_type,
    recommended_thinking = EXCLUDED.recommended_thinking,
    max_output_tokens = EXCLUDED.max_output_tokens,
    free_tier_rpm = EXCLUDED.free_tier_rpm,
    free_tier_tpm = EXCLUDED.free_tier_tpm,
    free_tier_rpd = EXCLUDED.free_tier_rpd,
    use_case_tags = EXCLUDED.use_case_tags;

-- =============================================
-- SEED: Gemini 2.5 Pro (PAID ONLY)
-- =============================================
INSERT INTO public.ai_model_settings (
    model_id, name, category, tagline, description,
    supported_inputs, supported_outputs, input_token_limit, output_token_limit,
    capabilities, thinking_config_type, recommended_thinking,
    temperature, top_p, top_k, max_output_tokens,
    free_tier_rpm, free_tier_tpm, free_tier_rpd,
    use_case_tags, timeout_ms, retries, is_active
) VALUES (
    'gemini-2.5-pro',
    'Gemini 2.5 Pro',
    'Gemini 2.5 Pro',
    'State-of-the-art thinking model for complex code, math, STEM, and long context analysis',
    'Reserve for genuinely complex tasks: deep code generation, STEM research, long document analysis. 4–5x cost vs Flash. Not available on Free Tier.',
    '["Audio","Image","Video","Text","PDF"]'::jsonb,
    '["Text"]'::jsonb,
    1048576, 65536,
    '{"audio_generation":false,"batch_api":true,"caching":true,"code_execution":true,"file_search":true,"function_calling":true,"image_generation":false,"live_api":false,"search_grounding":true,"structured_outputs":true,"thinking":true,"url_context":true}'::jsonb,
    'budget', '8192',
    1.0, 0.95, 40, 65536,
    NULL, NULL, NULL,
    '["complex-code","math","stem","long-context"]'::jsonb,
    600000, 3, false
) ON CONFLICT (model_id) DO UPDATE SET
    category = EXCLUDED.category,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    supported_inputs = EXCLUDED.supported_inputs,
    supported_outputs = EXCLUDED.supported_outputs,
    input_token_limit = EXCLUDED.input_token_limit,
    output_token_limit = EXCLUDED.output_token_limit,
    capabilities = EXCLUDED.capabilities,
    thinking_config_type = EXCLUDED.thinking_config_type,
    recommended_thinking = EXCLUDED.recommended_thinking,
    max_output_tokens = EXCLUDED.max_output_tokens,
    free_tier_rpm = EXCLUDED.free_tier_rpm,
    free_tier_tpm = EXCLUDED.free_tier_tpm,
    free_tier_rpd = EXCLUDED.free_tier_rpd,
    use_case_tags = EXCLUDED.use_case_tags;

-- =============================================
-- SEED: Gemini 2.0 Flash
-- =============================================
INSERT INTO public.ai_model_settings (
    model_id, name, category, tagline, description,
    supported_inputs, supported_outputs, input_token_limit, output_token_limit,
    capabilities, thinking_config_type, recommended_thinking,
    temperature, top_p, top_k, max_output_tokens,
    free_tier_rpm, free_tier_tpm, free_tier_rpd,
    use_case_tags, timeout_ms, retries, is_active
) VALUES (
    'gemini-2.0-flash',
    'Gemini 2.0 Flash',
    'Gemini 2.0 Flash',
    'Second generation workhorse model with 1M token context window',
    'Stable, widely supported model. Good for existing workflows that were built on Gemini 2.0. Prefer 2.5 Flash for new pipelines. 1M token context window available.',
    '["Audio","Image","Video","Text"]'::jsonb,
    '["Text"]'::jsonb,
    1048576, 8192,
    '{"audio_generation":false,"batch_api":true,"caching":true,"code_execution":true,"file_search":false,"function_calling":true,"image_generation":false,"live_api":false,"search_grounding":true,"structured_outputs":true,"thinking":false,"url_context":false}'::jsonb,
    'none', NULL,
    1.0, 0.95, 40, 8192,
    15, 1000000, 1500,
    '["legacy","content-gen","summarization"]'::jsonb,
    300000, 3, true
) ON CONFLICT (model_id) DO UPDATE SET
    category = EXCLUDED.category,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    supported_inputs = EXCLUDED.supported_inputs,
    supported_outputs = EXCLUDED.supported_outputs,
    input_token_limit = EXCLUDED.input_token_limit,
    output_token_limit = EXCLUDED.output_token_limit,
    capabilities = EXCLUDED.capabilities,
    thinking_config_type = EXCLUDED.thinking_config_type,
    recommended_thinking = EXCLUDED.recommended_thinking,
    max_output_tokens = EXCLUDED.max_output_tokens,
    free_tier_rpm = EXCLUDED.free_tier_rpm,
    free_tier_tpm = EXCLUDED.free_tier_tpm,
    free_tier_rpd = EXCLUDED.free_tier_rpd,
    use_case_tags = EXCLUDED.use_case_tags;

-- =============================================
-- SEED: Gemini 2.0 Flash-Lite
-- =============================================
INSERT INTO public.ai_model_settings (
    model_id, name, category, tagline, description,
    supported_inputs, supported_outputs, input_token_limit, output_token_limit,
    capabilities, thinking_config_type, recommended_thinking,
    temperature, top_p, top_k, max_output_tokens,
    free_tier_rpm, free_tier_tpm, free_tier_rpd,
    use_case_tags, timeout_ms, retries, is_active
) VALUES (
    'gemini-2.0-flash-lite',
    'Gemini 2.0 Flash-Lite',
    'Gemini 2.0 Flash-Lite',
    'Second generation small workhorse model optimized for cost efficiency and low latency',
    'Lightweight stable model suitable for simple extraction and formatting tasks. No thinking support. Use 2.5 Flash-Lite for new pipelines requiring thinking.',
    '["Audio","Image","Video","Text"]'::jsonb,
    '["Text"]'::jsonb,
    1048576, 8192,
    '{"audio_generation":false,"batch_api":true,"caching":true,"code_execution":false,"file_search":false,"function_calling":true,"image_generation":false,"live_api":false,"search_grounding":false,"structured_outputs":true,"thinking":false,"url_context":false}'::jsonb,
    'none', NULL,
    1.0, 0.95, 40, 8192,
    30, 1000000, 1500,
    '["classification","filtering","legacy","low-latency"]'::jsonb,
    120000, 3, true
) ON CONFLICT (model_id) DO UPDATE SET
    category = EXCLUDED.category,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    supported_inputs = EXCLUDED.supported_inputs,
    supported_outputs = EXCLUDED.supported_outputs,
    input_token_limit = EXCLUDED.input_token_limit,
    output_token_limit = EXCLUDED.output_token_limit,
    capabilities = EXCLUDED.capabilities,
    thinking_config_type = EXCLUDED.thinking_config_type,
    recommended_thinking = EXCLUDED.recommended_thinking,
    max_output_tokens = EXCLUDED.max_output_tokens,
    free_tier_rpm = EXCLUDED.free_tier_rpm,
    free_tier_tpm = EXCLUDED.free_tier_tpm,
    free_tier_rpd = EXCLUDED.free_tier_rpd,
    use_case_tags = EXCLUDED.use_case_tags;
