import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if(!supabaseUrl || !supabaseKey) {
  console.log("No Supabase env vars found in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    try {
        console.log("Attempting to get session...");
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        console.log("Session:", session ? "Active" : "None");
        
        console.log("Attempting to update ORC-10 without session (Anon)...");
        const { data, error } = await supabase
            .from('lab_orchestrator_configs')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', '140aa430-1a1d-4689-b5b6-338b78a2aa1c')
            .select()
            .single();
            
        console.log("Result:", { data, error });
    } catch(e) {
        console.log("Caught exception:", e);
    }
}

testUpdate();
