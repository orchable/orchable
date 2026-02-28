-- 🔨 Task [1.1] - Create document_assets table
-- Implements: openspec/changes/add-stage-io-features/specs/assets/spec.md
-- Requirement: Auxiliary Text Document Library Management

CREATE TABLE IF NOT EXISTS public.document_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase Storage or Reference for IndexedDB
    file_type TEXT NOT NULL, -- md, txt, csv, tsv
    size_bytes BIGINT DEFAULT 0,
    token_count_est INTEGER DEFAULT 0,
    config_id UUID REFERENCES public.lab_orchestrator_configs(id) ON DELETE CASCADE, -- Optional: link to a specific config or keep global
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_type TEXT NOT NULL DEFAULT 'supabase', -- supabase vs indexeddb
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_assets ENABLE ROW LEVEL SECURITY;

-- Policies for document_assets
CREATE POLICY "Users can manage their own documents"
    ON public.document_assets
    FOR ALL
    USING (auth.uid() = user_id);

-- 🔨 Task [1.2] - Update task_batches table
-- Implements: openspec/changes/add-stage-io-features/proposal.md
-- Requirement: Auxiliary Input (Data Snapshotting)

ALTER TABLE public.task_batches
ADD COLUMN IF NOT EXISTS global_context JSONB DEFAULT '{}'::jsonb;

-- Comment for traceability
COMMENT ON COLUMN public.task_batches.global_context IS 'Stores snapshots of auxiliary documents or caching IDs used by all tasks in this batch.';
