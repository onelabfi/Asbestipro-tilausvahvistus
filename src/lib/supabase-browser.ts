import { createClient } from '@supabase/supabase-js';

let _supabaseBrowser: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (!_supabaseBrowser) {
    _supabaseBrowser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabaseBrowser;
}
