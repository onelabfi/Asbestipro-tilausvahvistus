import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const city = searchParams.get('city');
  const status = searchParams.get('status');

  let query = getSupabase().from('orders').select('*').order('aika', { ascending: true });

  if (date) {
    query = query.gte('aika', `${date}T00:00:00`).lte('aika', `${date}T23:59:59`);
  }

  if (city) {
    query = query.eq('kaupunki', city);
  }

  if (status) {
    query = query.eq('payment_status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
