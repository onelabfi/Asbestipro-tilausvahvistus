import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { calculatePaymentStatus, hasRequiredOrderFields } from '@/lib/payment';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { id } = params;

    // If adding a payment amount, handle reconciliation
    if (body.add_payment !== undefined) {
      // First get current order
      const { data: current, error: fetchErr } = await getSupabase()
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !current) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const newMaksettu = (current.maksettu_summa || 0) + parseFloat(body.add_payment);
      const hasRequired = hasRequiredOrderFields(current);
      const newStatus = calculatePaymentStatus(current.hinta, newMaksettu, hasRequired);

      const { data, error } = await getSupabase()
        .from('orders')
        .update({
          maksettu_summa: newMaksettu,
          payment_status: newStatus,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    // If marking as paid manually, set maksettu_summa = hinta
    if (body.payment_status === 'paid' && body.payment_method === 'manual') {
      const { data: current } = await getSupabase()
        .from('orders')
        .select('hinta')
        .eq('id', id)
        .single();

      if (current) {
        body.maksettu_summa = current.hinta;
      }
    }

    // Recalculate status if maksettu_summa or hinta changed
    if (body.maksettu_summa !== undefined || body.hinta !== undefined) {
      const { data: current } = await getSupabase()
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (current) {
        const hinta = body.hinta !== undefined ? body.hinta : current.hinta;
        const maksettu = body.maksettu_summa !== undefined ? body.maksettu_summa : current.maksettu_summa;
        const merged = { ...current, ...body };
        const hasRequired = hasRequiredOrderFields(merged);
        body.payment_status = calculatePaymentStatus(hinta, maksettu, hasRequired);
      }
    }

    const { data, error } = await getSupabase()
      .from('orders')
      .update(body)
      .eq('id', id)
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  const { error } = await getSupabase()
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
