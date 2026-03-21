import type { Order, Sample } from './supabase';

// Static text constants — never change
export const TUTKIMUSMENETELMAT =
  'Näytteiden tutkimiseen on käytetty JEOL LIVE Analysis menetelmää hyödyntäen JEOL pyyhkäisyelektronimikroskooppia (SEM) sekä JEOL LIVE-EDS alkuaineanalysaattoria.';

export const ANALYYSIVARMUUS =
  'LIVE Analysis menetelmässä haetut atomit paikallistetaan reaaliaikaisella JEOL LIVE -ohjelmistolla hyödyntäen reaaliaikaista alkuaineanalysaattoria (LIVE-EDS). Haluttujen atomien paikantamisen jälkeen näyte tarkistetaan visuaalisesti pyyhkäisyelektronimikroskoopilla (SEM). Mahdolliset kuidut tunnistetaan niiden molekyylirakenteesta alkuaineanalysaattorilla (EDS). Analyysien virhemahdollisuus on korkeintaan 0,0001 %.';

export const ANALYSOINTIMENETELMA =
  'Näytteiden tutkimiseen on käytetty JEOL LIVE Analysis menetelmää hyödyntäen JEOL pyyhkäisyelektronimikroskooppia (SEM) sekä JEOL LIVE-EDS alkuaineanalysaattoria.';

export const SOPIMUSEHDOT =
  'Yleiset KSE 2013 sopimusehdot koskevat tätä toimeksiantoa. Raportin käyttö tai siihen viittaminen edellyttää toimitusehtojen hyväksymisen.';

export const KARTOITTAJA = 'Ronny Eklöf';
export const KARTOITTAJA_TITLE = 'Asbestikartoittaja';
export const KARTOITTAJA_CREDENTIALS = 'AHA-Asiantuntija, valtuutettu asbestipurkaja';

export const COMPANY_NAME = 'Suomen Asbestipro Oy';
export const COMPANY_YTUNNUS = '1581184-2';
export const COMPANY_ADDRESS = 'Ukkohauentie 11-13, 02170 Espoo';

/**
 * Parse compound location string "KPH S Matto, Liima" into
 * tila (room) and selite (description) for the report table.
 */
export function parseLocationForReport(location: string): { tila: string; selite: string } {
  if (!location) return { tila: '-', selite: '-' };

  const ROOMS = ['Keittiö', 'KPH', 'WC', 'MH', 'OH', 'Eteinen', 'Kellari', 'Ullakko', 'Katto', 'Sauna', 'Julkisivu', 'Porraskäytävä'];
  const parts = location.split(' ');

  if (parts.length === 0) return { tila: location, selite: '' };

  const firstWord = parts[0];
  if (!ROOMS.includes(firstWord)) {
    return { tila: location, selite: '' };
  }

  const tila = firstWord;
  let rest = parts.slice(1);

  // Check for S/L (seinä/lattia)
  let kohtaLabel = '';
  if (rest.length > 0 && (rest[0] === 'S' || rest[0] === 'L')) {
    kohtaLabel = rest[0] === 'S' ? 'seinän ' : 'lattian ';
    rest = rest.slice(1);
  }

  const materials = rest.join(' ');
  const selite = kohtaLabel + (materials || '').toLowerCase();

  return { tila, selite: selite.trim() || '-' };
}

/**
 * Build a human-readable Finnish location description for the Yleistä section.
 * e.g., "keittiön seinän laatassa ja laastissa"
 */
function buildLocationDescription(location: string): string {
  const { tila, selite } = parseLocationForReport(location);
  const tilaGenitive = tila.toLowerCase() + 'n'; // simple genitive
  if (selite && selite !== '-') {
    return `${tilaGenitive} ${selite}ssa`;
  }
  return tilaGenitive;
}

/**
 * Generate the dynamic "Yleistä kohteesta" text paragraphs.
 */
export function generateYleista(order: Order, samples: Sample[]): string[] {
  const paragraphs: string[] = [];

  // Sentence 1: Type of work
  if (order.kohde_tyyppi === 'purettava') {
    const katto = order.katto_materiaali || 'pelti';
    const runko = order.runko_materiaali || 'puu';
    paragraphs.push(`Kohteessa on tarkoitus purkaa ${katto}kattoinen ${runko}talo.`);
  } else {
    paragraphs.push('Kohteessa on tarkoitus tehdä pintaremonttia.');
  }

  // Sentence 2: Always the same
  paragraphs.push('Kohde kartoitettiin aistinvaraisesti ja näytteistettiin niiltä osin, kun oli epäiltävää, että materiaalissa saattaa olla asbestia tai muita haitta-aineita.');

  const asbestosSamples = samples.filter((s) => s.asbestos_detected === true);
  const hasAsbestos = asbestosSamples.length > 0;

  // Sentence 3: For purettava with no asbestos
  if (order.kohde_tyyppi === 'purettava' && !hasAsbestos) {
    paragraphs.push('Kohteen rakenteissa ei havaittu asbestia tai muita haitta-aineita.');
  }

  // Sentence 4: Result
  if (!hasAsbestos) {
    paragraphs.push('Laboratoriotutkimuksissa ei havaittu asbestia, joten materiaalit voidaan purkaa normaalipurkuna.');
  } else {
    const locations = asbestosSamples.map((s) => buildLocationDescription(s.location));
    let locationText: string;
    if (locations.length === 1) {
      locationText = locations[0];
    } else {
      locationText = locations.slice(0, -1).join(', ') + ' sekä ' + locations[locations.length - 1];
    }
    paragraphs.push(`${locationText.charAt(0).toUpperCase() + locationText.slice(1)} havaittiin asbestia, muilta osin materiaalit voidaan purkaa normaalipurkuna.`);
  }

  return paragraphs;
}
