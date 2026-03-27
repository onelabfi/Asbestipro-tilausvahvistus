import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getUserFromRequest } from '@/lib/supabase';
import { getResend } from '@/lib/resend';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabase();
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Tilausta ei löydy.' }, { status: 404 });
    }

    const aikaDate = new Date(order.aika);
    const aikaStr = aikaDate.toLocaleDateString('fi-FI', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await getResend().emails.send({
      from: 'Suomen Asbestipro Oy <onboarding@resend.dev>',
      to: order.email,
      subject: 'Tilaus vahvistettu',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Suomen Asbestipro Oy</h2>
          <p style="color: #666; font-size: 14px;">Asbesti- ja haitta-ainekartoitus</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Aika:</strong><br/>${aikaStr}</p>
          <p><strong>Osoite:</strong><br/>${order.osoite}<br/>${order.kaupunginosa}, ${order.kaupunki}</p>
          <p><strong>Remontti:</strong><br/>${order.remontti || '-'}</p>
          <p><strong>Sovittu hinta:</strong><br/>${order.hinta} €</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Suomen Asbestipro Oy</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Resend confirmation error:', err);
    return NextResponse.json({ error: 'Sähköpostin lähetys epäonnistui.' }, { status: 500 });
  }
}
