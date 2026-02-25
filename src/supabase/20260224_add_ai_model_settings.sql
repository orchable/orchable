-- Migration: Add ai_model_settings table
-- Description: Stores default configurations for AI models, manageable via Asset Library.

CREATE TABLE public.ai_model_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT NOT NULL UNIQUE, -- e.g., 'gemini-flash-latest'
    name TEXT NOT NULL,            -- e.g., 'Gemini Flash (Fast)'
    description TEXT,
    temperature NUMERIC DEFAULT 1.0,
    top_p NUMERIC DEFAULT 0.95,
    top_k INTEGER DEFAULT 40,
    max_output_tokens INTEGER DEFAULT 8192,
    generate_content_api TEXT DEFAULT 'generateContent',
    timeout_ms INTEGER DEFAULT 300000,
    retries INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    organization_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_model_settings ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Enable read access for all users" ON public.ai_model_settings FOR SELECT USING (true);
CREATE POLICY "Enable modify access for authenticated users" ON public.ai_model_settings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON public.ai_model_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for authenticated users" ON public.ai_model_settings FOR DELETE USING (auth.role() = 'authenticated');

-- Seed Default Data
INSERT INTO public.ai_model_settings (model_id, name, description, temperature, top_p, top_k, max_output_tokens, timeout_ms, retries)
VALUES
    ('gemini-flash-latest', 'Gemini Flash (Fast)', 'Fast and cost-effective model for most tasks.', 1.0, 0.95, 40, 8192, 300000, 3)
ON CONFLICT (model_id) DO NOTHING;

INSERT INTO public.ai_model_settings (model_id, name, description, temperature, top_p, top_k, max_output_tokens, timeout_ms, retries)
VALUES
    ('gemini-pro-latest', 'Gemini Pro (Quality)', 'High-quality model for complex reasoning tasks.', 1.0, 0.95, 40, 8192, 300000, 3)
ON CONFLICT (model_id) DO NOTHING;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.ai_model_settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
