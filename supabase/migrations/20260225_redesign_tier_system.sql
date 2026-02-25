-- Database migration for Redesign Tier System

-- 1. Add pool_type to user_api_keys
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_key_pool_type') THEN
        CREATE TYPE api_key_pool_type AS ENUM ('personal', 'free_pool', 'premium_pool');
    END IF;
END $$;

ALTER TABLE IF EXISTS user_api_keys 
ADD COLUMN IF NOT EXISTS pool_type api_key_pool_type DEFAULT 'personal';

-- 2. Create user_usage table
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  task_count INT DEFAULT 0,
  token_input_count BIGINT DEFAULT 0,
  token_output_count BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month)
);

-- 3. Enable RLS on user_usage
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON user_usage FOR SELECT
  USING (auth.uid() = user_id);

-- 4. RPC: Increment usage
CREATE OR REPLACE FUNCTION increment_user_usage(
  p_user_id UUID, 
  p_tasks INT DEFAULT 1,
  p_input_tokens BIGINT DEFAULT 0, 
  p_output_tokens BIGINT DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_usage (user_id, month, task_count, token_input_count, token_output_count)
  VALUES (p_user_id, to_char(now(), 'YYYY-MM'), p_tasks, p_input_tokens, p_output_tokens)
  ON CONFLICT (user_id, month) DO UPDATE SET
    task_count = user_usage.task_count + p_tasks,
    token_input_count = user_usage.token_input_count + p_input_tokens,
    token_output_count = user_usage.token_output_count + p_output_tokens,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Get usage
CREATE OR REPLACE FUNCTION get_user_usage(p_user_id UUID)
RETURNS TABLE (
  month VARCHAR(7),
  task_count INT,
  token_input_count BIGINT,
  token_output_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.month, u.task_count, u.token_input_count, u.token_output_count
  FROM user_usage u
  WHERE u.user_id = p_user_id
  AND u.month = to_char(now(), 'YYYY-MM');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
