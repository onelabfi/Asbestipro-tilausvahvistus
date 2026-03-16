import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

export type Order = {
  id: string;
  created_at: string;
  kaupunki: string;
  kaupunginosa: string;
  osoite: string;
  postinumero: string;
  latitude: number;
  longitude: number;
  palvelu: string;
  remontti: string;
  aika: string;
  hinta: number;
  nimi: string;
  email: string;
  puhelin: string;
  payment_status: string;
  stripe_session_id: string;
  notes: string;
};

export type UserRole = 'admin' | 'field_user';
