-- 20260301_seed_qwen_minimax_models.sql
-- Add Qwen and MiniMax models to ai_model_settings
-- Update DeepSeek context window to be more accurate (128k)

INSERT INTO ai_model_settings (
    model_id, 
    name, 
    provider, 
    category, 
    tagline, 
    description, 
    input_token_limit, 
    output_token_limit, 
    max_output_tokens,
    is_active, 
    temperature,
    use_case_tags
) VALUES 
-- Qwen Models
(
    'qwen-max', 
    'Qwen Max', 
    'qwen', 
    'reasoning', 
    'Flagship model from Alibaba', 
    'Most powerful model in the Qwen series, competitive with GPT-4o.', 
    32768, 
    8192, 
    8192,
    true, 
    0.7,
    '["general", "reasoning", "coding"]'::jsonb
),
(
    'qwen-plus', 
    'Qwen Plus', 
    'qwen', 
    'balanced', 
    'Fast and strong balanced model', 
    'Excellent balance between speed and performance.', 
    131072, 
    8192, 
    8192,
    true, 
    0.7,
    '["general", "coding"]'::jsonb
),
(
    'qwen-coder-plus', 
    'Qwen Coder Plus', 
    'qwen', 
    'coding', 
    'Specialized coding model', 
    'Highly optimized for software development and technical tasks.', 
    131072, 
    8192, 
    8192,
    true, 
    0.2,
    '["coding", "technical"]'::jsonb
),
-- MiniMax Models
(
    'minimax-01', 
    'MiniMax-01', 
    'minimax', 
    'reasoning', 
    'Native MoE architecture with massive context', 
    'Excellent reasoning performance with up to 1M+ context support.', 
    1048576, 
    8192, 
    8192,
    true, 
    0.7,
    '["long-context", "reasoning"]'::jsonb
),
(
    'minimax-m2.5-lightning', 
    'MiniMax Lightning', 
    'minimax', 
    'balanced', 
    'Ultra-fast agentic operations', 
    'Designed for real-time applications and agentic workflows.', 
    128000, 
    8192, 
    8192,
    true, 
    0.7,
    '["speed", "agents"]'::jsonb
)
ON CONFLICT (model_id) WHERE user_id IS NULL 
DO UPDATE SET 
    provider = EXCLUDED.provider,
    input_token_limit = EXCLUDED.input_token_limit,
    description = EXCLUDED.description;

-- Update DeepSeek limits to 128k (standard for deepseek-chat)
UPDATE ai_model_settings 
SET input_token_limit = 128000
WHERE model_id IN ('deepseek-chat', 'deepseek-reasoner') AND user_id IS NULL;
