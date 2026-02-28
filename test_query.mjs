import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgicwkftbiqdyyfmdicu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1naWN3a2Z0YmlxZHl5Zm1kaWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyODQwNjksImV4cCI6MjA2MDg2MDA2OX0.PmOFLMkanyt_7fYzjIScJ3-VEdGE6yK4PSyvhMyAEc4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('task_batches')
    .select('id, name, total_tasks, completed_tasks, failed_tasks, pending_tasks, processing_tasks, status')
    .order('created_at', { ascending: false })
    .limit(2);
    
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

main();
