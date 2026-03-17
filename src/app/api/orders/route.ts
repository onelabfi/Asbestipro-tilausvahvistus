import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { calculatePaymentStatus, hasRequiredOrderFields } from '@/lib/payment';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const hinta = parseFloat(body.hinta) || 0;
    const maksettu = parseFloat(body.maksettu_summa) || 0;

    const orderFields = {
      nimi: body.nimi || '',
      kaupunki: body.kaupunki || '',
      kaupunginosa: body.kaupunginosa || '',
      osoite: body.osoite || '',
      puhelin: body.puhelin || '',
      aika: body.aika,
      hinta,
    };

    const hasRequired = hasRequiredOrderFields(orderFields);
    const paymentStatus = calculatePaymentStatus(hinta, maksettu, hasRequired);

    const orderData = {
      ...orderFields,
      postinumero: body.postinumero || '',
      email: body.email || '',
      palvelu: body.palvelu || 'Asbesti- ja haitta-ainekartoitus',
      remontti: body.remontti || '',
      latitude: body.latitude || 0,
      longitude: body.longitude || 0,
      maksettu_summa: maksettu,
      payment_status: paymentStatus,
      payment_method: body.payment_method || 'manual',
      notes: body.notes || '',
    };

    const { data, error } = await getSupabase()
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
