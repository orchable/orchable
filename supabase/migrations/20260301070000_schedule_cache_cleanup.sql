-- Migration: Schedule Gemini Cache Cleanup
-- Description: Sets up a pg_cron job to call the cleanup-caches edge function hourly.

-- Enable pg_cron if not already enabled
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the cleanup
SELECT cron.schedule(
  'gemini-cache-cleanup',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://pblhqgylryfayqohptaa.supabase.co/functions/v1/cleanup-caches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    timeout_milliseconds := 5000
  ) AS request_id;
  $$
);
