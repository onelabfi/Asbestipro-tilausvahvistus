import { google } from 'googleapis';

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
}

export async function addCalendarEvent(order: {
  kaupunginosa: string;
  aika: string;
  nimi: string;
  puhelin: string;
  email: string;
  osoite: string;
  postinumero: string;
  remontti: string;
  hinta: number;
}) {
  const auth = getAuth();
  const calendar = google.calendar({ version: 'v3', auth });

  const startTime = new Date(order.aika);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // +30min

  const description = `Asbesti- ja haitta-ainekartoitus

Asiakas:
${order.nimi}

Puhelin:
${order.puhelin}

Sähköposti:
${order.email}

Osoite:
${order.osoite}
${order.postinumero}

Remontti:
${order.remontti}

Hinta:
${order.hinta} €`;

  await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    requestBody: {
      summary: order.kaupunginosa,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Helsinki',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Helsinki',
      },
      description,
    },
  });
}
