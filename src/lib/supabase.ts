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
  hinta: number;           // agreed price (sovittu_hinta)
  maksettu_summa: number;  // amount paid so far
  nimi: string;
  email: string;
  puhelin: string;
  payment_status: string;
  payment_method: string;
  stripe_session_id: string;
  notes: string;
  customer_type: string;   // 'company' | 'private'
  y_tunnus: string;        // business ID
  billing_address: string;
  terms_accepted: boolean;
};

export type UserRole = 'admin' | 'field_user';

/**
 * Find a Quick Note (manual order) that matches by phone number + date (±1 day).
 * Used by tilausvahvistus flows to overwrite placeholder events instead of creating duplicates.
 */
export async function findMatchingQuickNote(
  puhelin: string,
  aika: string
): Promise<{ id: string; notes: string } | null> {
  if (!puhelin) return null;

  // Normalize phone: strip spaces, dashes, parens
  const phone = puhelin.replace(/[\s\-()]/g, '');
  const date = new Date(aika);
  const dayBefore = new Date(date.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const dayAfter = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data } = await getSupabase()
    .from('orders')
    .select('id, puhelin, notes')
    .eq('payment_method', 'manual')
    .gte('aika', dayBefore)
    .lte('aika', dayAfter);

  if (!data || data.length === 0) return null;

  // Match by normalized phone number
  const match = data.find(
    (o) => o.puhelin.replace(/[\s\-()]/g, '') === phone
  );

  return match ? { id: match.id, notes: match.notes || '' } : null;
}
