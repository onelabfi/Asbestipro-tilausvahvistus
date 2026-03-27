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

    const host = req.headers.get('host') || 'asbestipro-tilausvahvistus.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const reportUrl = `${protocol}://${host}/r/${params.id}`;

    const aikaDate = new Date(order.aika);
    const aikaStr = aikaDate.toLocaleDateString('fi-FI', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Save sent timestamp to database
    await supabase
      .from('orders')
      .update({ report_sent_at: new Date().toISOString() })
      .eq('id', params.id);

    await getResend().emails.send({
      from: 'Suomen Asbestipro Oy <onboarding@resend.dev>',
      to: order.email,
      subject: `Asbestikartoitusraportti — ${order.osoite}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Suomen Asbestipro Oy</h2>
          <p style="color: #666; font-size: 14px;">Asbesti- ja haitta-ainekartoitus</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p>Hei ${order.nimi},</p>
          <p>Asbestikartoitusraporttinne kohteesta <strong>${order.osoite}</strong> (${aikaStr}) on valmis.</p>
          <p>Voitte tarkastella ja ladata raportin PDF-muodossa alla olevasta linkistä:</p>
          <p style="margin: 24px 0;">
            <a href="${reportUrl}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
              Avaa raportti
            </a>
          </p>
          <p style="color: #999; font-size: 12px;">Tai kopioi linkki selaimeesi:<br/>${reportUrl}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Suomen Asbestipro Oy · Y-tunnus 1581184-2 · Ukkohauentie 11-13, 02170 Espoo</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Send report error:', err);
    return NextResponse.json({ error: 'Sähköpostin lähetys epäonnistui.' }, { status: 500 });
  }
}
