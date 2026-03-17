'use client';

import { useState, useEffect } from 'react';

type OrderData = {
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

export default function InvoiceConfirmationPage() {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [customerType, setCustomerType] = useState<'private' | 'company'>('private');
  const [yTunnus, setYTunnus] = useState('');
  const [nimi, setNimi] = useState('');
  const [email, setEmail] = useState('');
  const [puhelin, setPuhelin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('invoice_order_data');
    if (stored) {
      try {
        const data = JSON.parse(stored) as OrderData;
        setOrderData(data);
        setNimi(data.nimi || '');
        setEmail(data.email || '');
        setPuhelin(data.puhelin || '');
      } catch {
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nimi || !email || !puhelin) {
      setError('Täytä kaikki pakolliset kentät.');
      return;
    }
    if (customerType === 'company' && !yTunnus) {
      setError('Y-tunnus on pakollinen yrityksille.');
      return;
    }
    if (!billingAddress) {
      setError('Laskutusosoite on pakollinen.');
      return;
    }
    if (!termsAccepted) {
      setError('Hyväksy toimitusehdot jatkaaksesi.');
      return;
    }

    if (!orderData) return;

    setLoading(true);
    try {
      const price = parseFloat(orderData.hinta);
      const invoiceTotal = price + 4.90;

      const res = await fetch('/api/create-invoice-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderData,
          hinta: invoiceTotal,
          nimi,
          email,
          puhelin,
          customer_type: customerType,
          y_tunnus: customerType === 'company' ? yTunnus : '',
          billing_address: billingAddress,
          terms_accepted: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('invoice_order_data');
        setSubmitted(true);
      } else {
        setError(data.error || 'Virhe tilauksen luomisessa.');
      }
    } catch {
      setError('Yhteysvirhe. Yritä uudelleen.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tilaus vahvistettu!</h2>
          <p className="text-gray-600 mb-1">Lasku lähetetään sähköpostiin.</p>
          <p className="text-sm text-gray-500">Laskutuslisä 4,90 € sisältyy hintaan.</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Ladataan...</p>
      </div>
    );
  }

  const price = parseFloat(orderData.hinta);
  const invoiceTotal = price + 4.90;
  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Laskutustiedot</h1>
          <p className="text-sm text-gray-500 mb-6">
            {orderData.osoite}, {orderData.kaupunginosa} &mdash; {invoiceTotal.toFixed(2)} €
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Type */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Asiakastyyppi</h2>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCustomerType('private')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    customerType === 'private'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Yksityisasiakas
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType('company')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors border-l ${
                    customerType === 'company'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Yritys
                </button>
              </div>
            </div>

            {/* Y-tunnus for companies */}
            {customerType === 'company' && (
              <div>
                <label className={labelClass}>Y-tunnus *</label>
                <input
                  type="text"
                  value={yTunnus}
                  onChange={(e) => setYTunnus(e.target.value)}
                  placeholder="1234567-8"
                  className={inputClass}
                />
              </div>
            )}

            {/* Customer info */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Tilaaja</h2>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Nimi *</label>
                  <input
                    type="text"
                    value={nimi}
                    onChange={(e) => setNimi(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Sähköposti *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Puhelin *</label>
                  <input
                    type="tel"
                    value={puhelin}
                    onChange={(e) => setPuhelin(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Billing address */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Laskutusosoite</h2>
              <div>
                <label className={labelClass}>Laskutusosoite *</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Katuosoite, Postinumero Kaupunki"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                Hyväksyn{' '}
                <a
                  href="https://www.onelab.fi/_files/ugd/bdb8e0_77f0a2258ab14ba48643c265f2741ac8.pdf?index=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  toimitusehdot
                </a>
                {' '}*
              </label>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Kartoituksen hinta</span>
                <span className="font-medium">{price.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Laskutuslisä</span>
                <span className="font-medium">4,90 €</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Yhteensä</span>
                <span>{invoiceTotal.toFixed(2)} €</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-500 text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors"
            >
              {loading ? 'Lähetetään...' : 'Lähetä'}
            </button>

            <button
              type="button"
              onClick={() => window.history.back()}
              className="w-full text-gray-500 text-sm hover:text-gray-700 py-2"
            >
              &larr; Palaa takaisin
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
