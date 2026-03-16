'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Order } from '@/lib/supabase';

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (Array.isArray(data)) {
        const found = data.find((o: Order) => o.id === params.id);
        setOrder(found || null);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Ladataan...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Tilausta ei löytynyt.</p>
      </div>
    );
  }

  const aikaDate = new Date(order.aika);
  const aikaStr = aikaDate.toLocaleDateString('fi-FI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const smsLink = () => {
    const msg = `Hei! Vahvista tilaus täältä: ${process.env.NEXT_PUBLIC_APP_URL || 'https://tilaus.asbesti.pro'}`;
    return `sms:${order.puhelin}?body=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <button onClick={() => window.history.back()} className="text-blue-600 text-sm font-medium">
          &larr; Takaisin
        </button>
        <h1 className="text-lg font-bold">Tilaus</h1>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{order.kaupunginosa}</h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                order.payment_status === 'paid'
                  ? 'bg-green-100 text-green-700'
                  : order.payment_status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {order.payment_status === 'paid'
                ? 'Maksettu'
                : order.payment_status === 'failed'
                ? 'Epäonnistunut'
                : 'Odottaa'}
            </span>
          </div>

          <hr />

          <div className="grid gap-4 text-sm">
            <div>
              <span className="text-gray-500">Asiakas</span>
              <p className="font-medium text-base">{order.nimi}</p>
            </div>
            <div>
              <span className="text-gray-500">Puhelin</span>
              <p className="font-medium">
                <a href={`tel:${order.puhelin}`} className="text-blue-600">
                  {order.puhelin}
                </a>
              </p>
            </div>
            <div>
              <span className="text-gray-500">Sähköposti</span>
              <p className="font-medium">
                <a href={`mailto:${order.email}`} className="text-blue-600">
                  {order.email}
                </a>
              </p>
            </div>
            <div>
              <span className="text-gray-500">Osoite</span>
              <p className="font-medium">{order.osoite}</p>
              <p className="text-gray-600">
                {order.kaupunginosa}, {order.kaupunki}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Aika</span>
              <p className="font-medium">{aikaStr}</p>
            </div>
            <div>
              <span className="text-gray-500">Remontti</span>
              <p className="font-medium">{order.remontti || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Hinta</span>
              <p className="font-medium text-lg">{order.hinta} €</p>
            </div>
          </div>

          <hr />

          <div className="space-y-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Avaa Google Maps
            </a>
            <a
              href={`tel:${order.puhelin}`}
              className="block w-full text-center bg-gray-800 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-900"
            >
              Soita asiakkaalle
            </a>
            <a
              href={smsLink()}
              className="block w-full text-center bg-green-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Lähetä vahvistuslinkki (SMS)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
