'use client';

import { useState } from 'react';
import AddressAutocomplete from './AddressAutocomplete';

type FormData = {
  kaupunki: string;
  kaupunginosa: string;
  osoite: string;
  postinumero: string;
  latitude: number;
  longitude: number;
  palvelu: string;
  aika: string;
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
  aika: '',
  hinta: '',
  remontti: '',
  nimi: '',
  email: '',
  puhelin: '',
};

export default function OrderForm() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field: keyof FormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.kaupunki || !form.kaupunginosa || !form.osoite || !form.aika || !form.hinta || !form.nimi || !form.email || !form.puhelin) {
      setError('Täytä kaikki pakolliset kentät.');
      return;
    }

    const hinta = parseFloat(form.hinta);
    if (isNaN(hinta) || hinta <= 0) {
      setError('Tarkista hinta.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, hinta }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Virhe maksun luomisessa.');
      }
    } catch {
      setError('Yhteysvirhe. Yritä uudelleen.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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
                className={inputClass}
                readOnly
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
          <div>
            <label className={labelClass}>Sovittu aika *</label>
            <input
              type="datetime-local"
              value={form.aika}
              onChange={(e) => update('aika', e.target.value)}
              className={inputClass}
            />
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

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors"
      >
        {loading ? 'Ladataan...' : 'Siirry maksuun'}
      </button>
    </form>
  );
}
