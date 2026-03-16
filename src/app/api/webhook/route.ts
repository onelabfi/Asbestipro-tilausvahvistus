import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { addCalendarEvent } from '@/lib/google-calendar';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const m = session.metadata!;

    const orderData = {
      kaupunki: m.kaupunki,
      kaupunginosa: m.kaupunginosa,
      osoite: m.osoite,
      postinumero: m.postinumero,
      latitude: parseFloat(m.latitude) || 0,
      longitude: parseFloat(m.longitude) || 0,
      palvelu: m.palvelu,
      remontti: m.remontti,
      aika: m.aika,
      hinta: parseFloat(m.hinta),
      nimi: m.nimi,
      email: m.email,
      puhelin: m.puhelin,
      payment_status: 'paid',
      stripe_session_id: session.id,
    };

    // 1. Save to database
    const { error: dbError } = await getSupabase().from('orders').insert(orderData);
    if (dbError) console.error('DB error:', dbError);

    // 2. Send confirmation email
    try {
      const aikaDate = new Date(m.aika);
      const aikaStr = aikaDate.toLocaleDateString('fi-FI', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      await getResend().emails.send({
        from: 'Suomen Asbestipro Oy <noreply@asbesti.pro>',
        to: m.email,
        subject: 'Tilaus vahvistettu',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a2e;">Suomen Asbestipro Oy</h2>
            <p style="color: #666; font-size: 14px;">Asbesti- ja haitta-ainekartoitus</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Aika:</strong><br/>${aikaStr}</p>
            <p><strong>Osoite:</strong><br/>${m.osoite}<br/>${m.kaupunginosa}, ${m.kaupunki}</p>
            <p><strong>Remontti:</strong><br/>${m.remontti || '-'}</p>
            <p><strong>Sovittu hinta:</strong><br/>${m.hinta} €</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px;">Suomen Asbestipro Oy</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    // 3. Add Google Calendar event
    try {
      await addCalendarEvent({
        kaupunginosa: m.kaupunginosa,
        aika: m.aika,
        nimi: m.nimi,
        puhelin: m.puhelin,
        email: m.email,
        osoite: m.osoite,
        postinumero: m.postinumero,
        remontti: m.remontti,
        hinta: parseFloat(m.hinta),
      });
    } catch (calError) {
      console.error('Calendar error:', calError);
    }
  }

  return NextResponse.json({ received: true });
}
