import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// GET /api/orders/[id]/samples — list samples for an order
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await getSupabase()
    .from('samples')
    .select('*')
    .eq('order_id', params.id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST /api/orders/[id]/samples — create a new sample
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { location, notes } = body;

  if (!location) {
    return NextResponse.json({ error: 'Location is required.' }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from('samples')
    .insert({
      order_id: params.id,
      location,
      notes: notes || null,
      area_m2: body.area_m2 ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
