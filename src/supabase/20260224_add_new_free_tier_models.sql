-- Migration to add new Gemini and Gemma free tier models
-- Date: 2026-02-24

INSERT INTO public.ai_model_settings (
    model_id, 
    name, 
    category, 
    tagline, 
    description, 
    supported_inputs, 
    supported_outputs, 
    input_token_limit, 
    output_token_limit, 
    capabilities, 
    free_tier_rpm, 
    free_tier_tpm, 
    free_tier_rpd, 
    use_case_tags,
    temperature,
    top_p,
    top_k,
    max_output_tokens,
    is_active
) VALUES 
-- Gemini 3 Flash
(
    'gemini-3-flash', 
    'Gemini 3 Flash', 
    'Text-out', 
    'Next-generation ultra-fast model', 
    'Optimized for latency and efficiency with advanced reasoning capabilities.', 
    '["text", "image", "video", "audio", "pdf"]'::jsonb, 
    '["text"]'::jsonb, 
    1000000, 65536, 
    '{"thinking": true, "function_calling": true, "search_grounding": true, "code_execution": true}'::jsonb, 
    5, 250000, 20, 
    '["fast", "reasoning", "multimodal"]'::jsonb,
    1.0, 0.95, 40, 65536, true
),
-- Gemini 2.5 Flash
(
    'gemini-2.5-flash', 
    'Gemini 2.5 Flash', 
    'Text-out', 
    'High-performance balanced model', 
    'Massive context window with robust multimodal understanding and reasoning.', 
    '["text", "image", "video", "audio", "pdf"]'::jsonb, 
    '["text"]'::jsonb, 
    1000000, 65536, 
    '{"thinking": true, "function_calling": true, "search_grounding": true, "code_execution": true}'::jsonb, 
    5, 250000, 20, 
    '["balanced", "reasoning", "multimodal"]'::jsonb,
    1.0, 0.95, 40, 65536, true
),
-- Gemini 2.5 Flash Lite
(
    'gemini-2.5-flash-lite', 
    'Gemini 2.5 Flash Lite', 
    'Text-out', 
    'Cost-efficient lightweight model', 
    'Best for high-volume, low-complexity tasks. Generous free tier quotas.', 
    '["text", "image", "video", "audio", "pdf"]'::jsonb, 
    '["text"]'::jsonb, 
    1000000, 65536, 
    '{"function_calling": true, "search_grounding": true}'::jsonb, 
    10, 250000, 20, 
    '["chat", "fast", "lite"]'::jsonb,
    1.0, 0.95, 40, 65536, true
),
-- Gemma 3 27B
(
    'gemma-3-27b', 
    'Gemma 3 27B', 
    'Open model', 
    'Highest quality open model from Google', 
    'State-of-the-art performance for its size, best for research and local-style deployment logic.', 
    '["text"]'::jsonb, 
    '["text"]'::jsonb, 
    8192, 4096, 
    '{"thinking": true}'::jsonb, 
    30, 15000, 14400, 
    '["open-source", "reasoning", "high-quality"]'::jsonb,
    0.7, 0.9, 40, 4096, true
),
-- Gemma 3 12B
(
    'gemma-3-12b', 
    'Gemma 3 12B', 
    'Open model', 
    'Strong performance/efficiency ratio', 
    'Versatile open model for coding and logic tasks.', 
    '["text"]'::jsonb, 
    '["text"]'::jsonb, 
    8192, 4096, 
    '{"thinking": true}'::jsonb, 
    30, 15000, 14400, 
    '["open-source", "balanced", "coding"]'::jsonb,
    0.7, 0.9, 40, 4096, true
),
-- Gemma 3 4B
(
    'gemma-3-4b', 
    'Gemma 3 4B', 
    'Open model', 
    'Compact and efficient', 
    'Optimized for speed and deployment on constrained environments.', 
    '["text"]'::jsonb, 
    '["text"]'::jsonb, 
    8192, 2048, 
    '{}'::jsonb, 
    30, 15000, 14400, 
    '["open-source", "fast", "mobile-friendly"]'::jsonb,
    0.6, 0.9, 40, 2048, true
),
-- Gemma 3 2B
(
    'gemma-3-2b', 
    'Gemma 3 2B', 
    'Open model', 
    'Ultra-lightweight', 
    'Extremely fast for basic text tasks.', 
    '["text"]'::jsonb, 
    '["text"]'::jsonb, 
    8192, 1024, 
    '{}'::jsonb, 
    30, 15000, 14400, 
    '["open-source", "ultra-fast"]'::jsonb,
    0.6, 0.9, 40, 1024, true
),
-- Gemma 3 1B
(
    'gemma-3-1b', 
    'Gemma 3 1B', 
    'Open model', 
    'Minimum footprint', 
    'Smallest Gemma 3 model for lightweight applications.', 
    '["text"]'::jsonb, 
    '["text"]'::jsonb, 
    8192, 512, 
    '{}'::jsonb, 
    30, 15000, 14400, 
    '["open-source", "minimal"]'::jsonb,
    0.6, 0.9, 40, 512, true
),
-- Gemini Embedding 1
(
    'gemini-embedding-1', 
    'Gemini Embedding 1', 
    'Embedding', 
    'Specialized model for vector embeddings', 
    'Generates high-dimensional vectors for semantic search and retrieval.', 
    '["text"]'::jsonb, 
    '["vector"]'::jsonb, 
    3072, 768, 
    '{}'::jsonb, 
    100, 30000, 1000, 
    '["embedding", "semantic-search"]'::jsonb,
    0.0, 1.0, 1, 768, true
)
ON CONFLICT (model_id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    supported_inputs = EXCLUDED.supported_inputs,
    supported_outputs = EXCLUDED.supported_outputs,
    input_token_limit = EXCLUDED.input_token_limit,
    output_token_limit = EXCLUDED.output_token_limit,
    capabilities = EXCLUDED.capabilities,
    free_tier_rpm = EXCLUDED.free_tier_rpm,
    free_tier_tpm = EXCLUDED.free_tier_tpm,
    free_tier_rpd = EXCLUDED.free_tier_rpd,
    use_case_tags = EXCLUDED.use_case_tags,
    updated_at = now();
