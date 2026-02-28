-- Fix output token limits for Gemini 2.5 Flash models

UPDATE public.ai_model_settings
SET 
    output_token_limit = 65536,
    max_output_tokens = 65536
WHERE model_id IN ('gemini-2.5-flash', 'gemini-2.5-flash-lite');
