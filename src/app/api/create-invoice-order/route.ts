import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, findMatchingQuickNote } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { calculatePaymentStatus } from '@/lib/payment';

// --- Spam protection: in-memory rate limiters ---
// Phone dedup: max 1 submission per phone per 10 minutes
const phoneSubmissions = new Map<string, number>();
// IP rate limit: max 5 submissions per IP per hour
const ipSubmissions = new Map<string, number[]>();

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '');
}

function isPhoneDuplicate(phone: string): boolean {
  const normalized = normalizePhone(phone);
  const lastTime = phoneSubmissions.get(normalized);
  if (lastTime && Date.now() - lastTime < 10 * 60 * 1000) {
    return true;
  }
  return false;
}

function recordPhoneSubmission(phone: string): void {
  phoneSubmissions.set(normalizePhone(phone), Date.now());
}

function isIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const timestamps = (ipSubmissions.get(ip) || []).filter(t => t > oneHourAgo);
  ipSubmissions.set(ip, timestamps);
  return timestamps.length >= 5;
}

function recordIpSubmission(ip: string): void {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const timestamps = (ipSubmissions.get(ip) || []).filter(t => t > oneHourAgo);
  timestamps.push(now);
  ipSubmissions.set(ip, timestamps);
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Skip in dev if not configured

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    console.error('Turnstile verification failed');
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- Protection 1: Honeypot ---
    if (body.website) {
      // Bot filled the hidden field — silently pretend success
      return NextResponse.json({ success: true });
    }

    // --- Protection 2: IP rate limit ---
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    if (isIpRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Liian monta pyyntöä. Yritä myöhemmin.' },
        { status: 429 }
      );
    }

    // --- Protection 3: Phone dedup ---
    const { kaupunki, kaupunginosa, osoite, postinumero, latitude, longitude, palvelu, aika, hinta, remontti, nimi, email, puhelin, customer_type, y_tunnus, billing_address, terms_accepted, turnstile_token } = body;

    if (puhelin && isPhoneDuplicate(puhelin)) {
      return NextResponse.json(
        { error: 'Tilaus on jo lähetetty. Odota hetki.' },
        { status: 429 }
      );
    }

    // --- Protection 4: Turnstile verification ---
    if (!turnstile_token) {
      // Only enforce if Turnstile is configured
      if (process.env.TURNSTILE_SECRET_KEY) {
        return NextResponse.json(
          { error: 'Vahvistus puuttuu. Yritä uudelleen.' },
          { status: 403 }
        );
      }
    } else {
      const valid = await verifyTurnstile(turnstile_token);
      if (!valid) {
        return NextResponse.json(
          { error: 'Vahvistus epäonnistui. Yritä uudelleen.' },
          { status: 403 }
        );
      }
    }

    // --- Original validation ---
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

    // Check for existing Quick Note with same phone + date — overwrite if found
    const existingNote = await findMatchingQuickNote(puhelin, aika);

    let dbError;
    if (existingNote) {
      // Preserve any notes from the Quick Note
      if (existingNote.notes) {
        orderData.notes = existingNote.notes;
      }
      const result = await getSupabase()
        .from('orders')
        .update(orderData)
        .eq('id', existingNote.id);
      dbError = result.error;
    } else {
      const result = await getSupabase().from('orders').insert(orderData);
      dbError = result.error;
    }

    if (dbError) {
      console.error('DB error:', JSON.stringify(dbError));
      return NextResponse.json({ error: 'Tietokantavirhe.' }, { status: 500 });
    }

    // Record successful submission for rate limiting
    recordPhoneSubmission(puhelin);
    recordIpSubmission(ip);

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
