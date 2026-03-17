'use client';

import { useState, useMemo } from 'react';
import AddressAutocomplete from './AddressAutocomplete';

type FormData = {
  kaupunki: string;
  kaupunginosa: string;
  osoite: string;
  postinumero: string;
  latitude: number;
  longitude: number;
  palvelu: string;
  aikaDate: string;
  aikaTime: string;
  hinta: string;
  remontti: string;
  nimi: string;
  email: string;
  puhelin: string;
};

const initialForm: FormData = {
  kaupunki: '',
  kaupunginosa: '',
  osoite: '',
  postinumero: '',
  latitude: 0,
  longitude: 0,
  palvelu: 'Asbesti- ja haitta-ainekartoitus',
  aikaDate: '',
  aikaTime: '',
  hinta: '',
  remontti: '',
  nimi: '',
  email: '',
  puhelin: '',
};

// Generate 30-min time slots from 07:00 to 19:00
const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

export default function OrderForm() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState<'stripe' | 'invoice' | null>(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<'stripe' | null>(null);

  const update = (field: keyof FormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const aika = useMemo(() => {
    if (form.aikaDate && form.aikaTime) return `${form.aikaDate}T${form.aikaTime}`;
    return '';
  }, [form.aikaDate, form.aikaTime]);

  const validate = (): number | null => {
    setError('');
    if (!form.kaupunki || !form.kaupunginosa || !form.osoite || !aika || !form.hinta || !form.nimi || !form.email || !form.puhelin) {
      setError('Täytä kaikki pakolliset kentät.');
      return null;
    }
    const hinta = parseFloat(form.hinta);
    if (isNaN(hinta) || hinta <= 0) {
      setError('Tarkista hinta.');
      return null;
    }
    return hinta;
  };

  const handleStripe = async () => {
    const hinta = validate();
    if (hinta === null) return;

    setLoading('stripe');
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, aika, hinta }),
      });
      const data = await res.json();
      if (data.url) {
        setSubmitted('stripe');
        window.location.href = data.url;
      } else {
        setError(data.error || 'Virhe maksun luomisessa.');
      }
    } catch {
      setError('Yhteysvirhe. Yritä uudelleen.');
    } finally {
      setLoading(null);
    }
  };

  const handleInvoice = () => {
    const hinta = validate();
    if (hinta === null) return;

    setLoading('invoice');
    // Store form data in localStorage and redirect to invoice confirmation page
    const orderData = {
      ...form,
      aika,
      hinta: String(hinta),
    };
    localStorage.setItem('invoice_order_data', JSON.stringify(orderData));
    window.location.href = '/invoice-confirmation';
  };

  if (submitted === 'stripe') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">Siirrytään maksuun...</p>
        <button onClick={() => setSubmitted(null)} className="text-blue-600 underline text-sm">
          Palaa lomakkeelle
        </button>
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
      {/* KOHDE */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Kohde</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Osoite *</label>
            <AddressAutocomplete
              value={form.osoite}
              onChange={(val) => update('osoite', val)}
              onSelect={(place) => {
                setForm((prev) => ({
                  ...prev,
                  osoite: place.osoite,
                  postinumero: place.postinumero,
                  kaupunki: place.kaupunki,
                  latitude: place.latitude,
                  longitude: place.longitude,
                }));
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Postinumero</label>
              <input
                type="text"
                value={form.postinumero}
                onChange={(e) => update('postinumero', e.target.value)}
                placeholder="00100"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Kaupunki *</label>
              <input
                type="text"
                value={form.kaupunki}
                onChange={(e) => update('kaupunki', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Kaupunginosa *</label>
            <input
              type="text"
              value={form.kaupunginosa}
              onChange={(e) => update('kaupunginosa', e.target.value)}
              placeholder="esim. Töölö"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* PALVELU */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Palvelu</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Palvelu</label>
            <select
              value={form.palvelu}
              onChange={(e) => update('palvelu', e.target.value)}
              className={inputClass}
            >
              <option value="Asbesti- ja haitta-ainekartoitus">
                Asbesti- ja haitta-ainekartoitus
              </option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Päivämäärä *</label>
              <input
                type="date"
                value={form.aikaDate}
                onChange={(e) => update('aikaDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Kellonaika *</label>
              <select
                value={form.aikaTime}
                onChange={(e) => update('aikaTime', e.target.value)}
                className={inputClass}
              >
                <option value="">Valitse</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Sovittu hinta (€) *</label>
            <input
              type="number"
              value={form.hinta}
              onChange={(e) => update('hinta', e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Mitä remontoidaan</label>
            <textarea
              value={form.remontti}
              onChange={(e) => update('remontti', e.target.value)}
              placeholder="Kuvaa remontti..."
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>
      </div>

      {/* TILAAJA */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Tilaaja</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Nimi *</label>
            <input
              type="text"
              value={form.nimi}
              onChange={(e) => update('nimi', e.target.value)}
              placeholder="Etunimi Sukunimi"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Sähköposti *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="email@esimerkki.fi"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Puhelinnumero *</label>
            <input
              type="tel"
              value={form.puhelin}
              onChange={(e) => update('puhelin', e.target.value)}
              placeholder="+358 40 123 4567"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Payment options */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 pb-2 border-b">Maksutapa</h2>
        <button
          type="button"
          onClick={handleStripe}
          disabled={!!loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors"
        >
          {loading === 'stripe' ? 'Ladataan...' : 'Maksa nyt (kortilla)'}
        </button>
        <button
          type="button"
          onClick={handleInvoice}
          disabled={!!loading}
          className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-500 text-white font-semibold py-4 px-6 rounded-lg text-base transition-colors"
        >
          {loading === 'invoice' ? 'Ladataan...' : 'Maksa myöhemmin laskulla (+4,90 €)'}
        </button>
        <p className="text-xs text-gray-400 text-center">
          Laskutuslisä 4,90 € lisätään hintaan valittaessa laskumaksu.
        </p>
      </div>
    </form>
  );
}
