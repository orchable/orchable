import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcGFyYXRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODk1MjAwMSwiZXhwIjoxODk2NjMxMjAwfQ.Y3Vwb...fake-key-placeholder...' // we need the actual anon key 
);

// Actually, I can just use psql!
