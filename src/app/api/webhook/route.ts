import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { addCalendarEvent } from '@/lib/google-calendar';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET not set');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', message);
      return NextResponse.json({ error: 'Invalid signature', details: message }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const m = session.metadata || {};

      console.log('Webhook received, metadata:', JSON.stringify(m));

      const orderData = {
        kaupunki: m.kaupunki || '',
        kaupunginosa: m.kaupunginosa || '',
        osoite: m.osoite || '',
        postinumero: m.postinumero || '',
        latitude: parseFloat(m.latitude) || 0,
        longitude: parseFloat(m.longitude) || 0,
        palvelu: m.palvelu || '',
        remontti: m.remontti || '',
        aika: m.aika || new Date().toISOString(),
        hinta: parseFloat(m.hinta) || 0,
        nimi: m.nimi || '',
        email: m.email || '',
        puhelin: m.puhelin || '',
        payment_status: 'paid',
        payment_method: 'stripe',
        stripe_session_id: session.id,
      };

      // 1. Save to database
      const { error: dbError } = await getSupabase().from('orders').insert(orderData);
      if (dbError) console.error('DB error:', JSON.stringify(dbError));

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
          from: 'Suomen Asbestipro Oy <onboarding@resend.dev>',
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
        console.log('Calendar env check:', {
          hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
          hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
          hasCalId: !!process.env.GOOGLE_CALENDAR_ID,
          email: process.env.GOOGLE_CLIENT_EMAIL,
          calId: process.env.GOOGLE_CALENDAR_ID,
        });
        await addCalendarEvent({
          kaupunginosa: m.kaupunginosa || '',
          aika: m.aika || new Date().toISOString(),
          nimi: m.nimi || '',
          puhelin: m.puhelin || '',
          email: m.email || '',
          osoite: m.osoite || '',
          postinumero: m.postinumero || '',
          remontti: m.remontti || '',
          hinta: parseFloat(m.hinta) || 0,
        });
        console.log('Calendar event created successfully');
      } catch (calError: unknown) {
        const calMsg = calError instanceof Error ? calError.message : JSON.stringify(calError);
        console.error('Calendar error:', calMsg);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook handler error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
