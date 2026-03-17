import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { calculatePaymentStatus } from '@/lib/payment';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { kaupunki, kaupunginosa, osoite, postinumero, latitude, longitude, palvelu, aika, hinta, remontti, nimi, email, puhelin, customer_type, y_tunnus, billing_address, terms_accepted } = body;

    if (!kaupunki || !kaupunginosa || !osoite || !aika || !hinta || !nimi || !email || !puhelin) {
      return NextResponse.json({ error: 'Puuttuvia tietoja.' }, { status: 400 });
    }

    const price = parseFloat(hinta);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Virheellinen hinta.' }, { status: 400 });
    }

    const paymentStatus = calculatePaymentStatus(price, 0, true);

    const orderData = {
      kaupunki: kaupunki || '',
      kaupunginosa: kaupunginosa || '',
      osoite: osoite || '',
      postinumero: postinumero || '',
      latitude: parseFloat(latitude) || 0,
      longitude: parseFloat(longitude) || 0,
      palvelu: palvelu || 'Asbesti- ja haitta-ainekartoitus',
      remontti: remontti || '',
      aika,
      hinta: price,
      maksettu_summa: 0,
      nimi,
      email,
      puhelin,
      payment_status: paymentStatus,
      payment_method: 'invoice',
      notes: '',
      customer_type: customer_type || 'private',
      y_tunnus: y_tunnus || '',
      billing_address: billing_address || '',
      terms_accepted: terms_accepted || false,
    };

    // Save to database
    const { error: dbError } = await getSupabase().from('orders').insert(orderData);
    if (dbError) {
      console.error('DB error:', JSON.stringify(dbError));
      return NextResponse.json({ error: 'Tietokantavirhe.' }, { status: 500 });
    }

    // Send confirmation email
    try {
      const aikaDate = new Date(aika);
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
        to: email,
        subject: 'Tilaus vahvistettu — lasku',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a2e;">Suomen Asbestipro Oy</h2>
            <p style="color: #666; font-size: 14px;">Asbesti- ja haitta-ainekartoitus</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Aika:</strong><br/>${aikaStr}</p>
            <p><strong>Osoite:</strong><br/>${osoite}<br/>${kaupunginosa}, ${kaupunki}</p>
            <p><strong>Remontti:</strong><br/>${remontti || '-'}</p>
            <p><strong>Hinta:</strong><br/>${price.toFixed(2)} € (sis. laskutuslisä 4,90 €)</p>
            ${customer_type === 'company' && y_tunnus ? `<p><strong>Y-tunnus:</strong><br/>${y_tunnus}</p>` : ''}
            <p style="color: #666; font-size: 13px;">Maksu: Lasku lähetetään erikseen.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px;">Suomen Asbestipro Oy</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Invoice order error:', err);
    return NextResponse.json({ error: 'Tilauksen luominen epäonnistui.' }, { status: 500 });
  }
}
