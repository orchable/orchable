import { createClient } from '@supabase/supabase-js';


const supabaseUrl = localStorage.getItem('orchable_supabase_url') || import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = localStorage.getItem('orchable_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

// Optional: Warn if using placeholder in dev, but allow app to start so Settings page can be accessed
if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('Supabase URL missing. Please configure in Settings.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

