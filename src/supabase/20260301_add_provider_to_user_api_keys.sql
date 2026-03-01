-- Add provider column to user_api_keys table
ALTER TABLE public.user_api_keys 
ADD COLUMN IF NOT EXISTS provider character varying DEFAULT 'gemini';

-- Update existing keys to have 'gemini' as provider if not set
UPDATE public.user_api_keys SET provider = 'gemini' WHERE provider IS NULL;

-- Add check constraint for supported providers
ALTER TABLE public.user_api_keys
ADD CONSTRAINT user_api_keys_provider_check 
CHECK (provider IN ('gemini', 'deepseek', 'openai'));
