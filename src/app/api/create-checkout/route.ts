import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Server validation
    const { kaupunki, kaupunginosa, osoite, postinumero, latitude, longitude, palvelu, aika, hinta, remontti, nimi, email, puhelin } = body;

    if (!kaupunki || !kaupunginosa || !osoite || !aika || !hinta || !nimi || !email || !puhelin) {
      return NextResponse.json({ error: 'Puuttuvia tietoja.' }, { status: 400 });
    }

    const price = parseFloat(hinta);
    if (isNaN(price) || price <= 0 || price > 100000) {
      return NextResponse.json({ error: 'Virheellinen hinta.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Virheellinen sähköposti.' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Asbesti- ja haitta-ainekartoitus',
              description: `Suomen Asbestipro Oy — ${osoite}, ${kaupunki}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/success`,
      cancel_url: appUrl,
      customer_email: email,
      metadata: {
        kaupunki,
        kaupunginosa,
        osoite,
        postinumero: postinumero || '',
        latitude: String(latitude || 0),
        longitude: String(longitude || 0),
        palvelu,
        aika,
        hinta: String(price),
        remontti: remontti || '',
        nimi,
        email,
        puhelin,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: 'Maksun luominen epäonnistui.' },
      { status: 500 }
    );
  }
}
