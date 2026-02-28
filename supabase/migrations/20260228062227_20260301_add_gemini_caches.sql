-- Migration: Create gemini_caches table
-- Description: Tracks Google Gemini Context Caching objects for large auxiliary files.

CREATE TABLE IF NOT EXISTS public.gemini_caches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.task_batches(id) ON DELETE CASCADE,
    cache_name VARCHAR NOT NULL,
    total_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS Policies
ALTER TABLE public.gemini_caches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gemini_caches"
ON public.gemini_caches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gemini_caches"
ON public.gemini_caches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gemini_caches"
ON public.gemini_caches FOR DELETE
USING (auth.uid() = user_id);

-- Create Index for faster lookup by batch
CREATE INDEX IF NOT EXISTS idx_gemini_caches_batch_id ON public.gemini_caches(batch_id);
