'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Order, Sample } from '@/lib/supabase';

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/orders/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/orders/${id}/samples`).then(r => r.ok ? r.json() : []),
    ]).then(([orderData, samplesData]) => {
      setOrder(orderData);
      setSamples(samplesData || []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400">Ladataan raporttia...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-500">Tilausta ei löytynyt.</p>
      </div>
    );
  }

  const aikaDate = new Date(order.aika);
  const dateStr = aikaDate.toLocaleDateString('fi-FI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = aikaDate.toLocaleTimeString('fi-FI', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const positiveCount = samples.filter(s => s.asbestos_detected === true).length;
  const negativeCount = samples.filter(s => s.asbestos_detected === false).length;
  const pendingCount = samples.filter(s => s.asbestos_detected === null).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Print button — hidden in print */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg"
        >
          🖨️ Tulosta / PDF
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 shadow-lg"
        >
          Sulje
        </button>
      </div>

      {/* Report content */}
      <div className="max-w-3xl mx-auto px-8 py-10 print:px-0 print:py-0">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Suomen Asbestipro Oy</h1>
          <p className="text-sm text-gray-500 mt-1">Asbesti- ja haitta-ainekartoitusraportti</p>
        </div>

        {/* Client & Event info */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Asiakas</h2>
            <p className="font-medium text-gray-900">{order.nimi || '-'}</p>
            {order.puhelin && <p className="text-sm text-gray-600">{order.puhelin}</p>}
            {order.email && <p className="text-sm text-gray-600">{order.email}</p>}
            {order.customer_type === 'company' && order.y_tunnus && (
              <p className="text-sm text-gray-600">Y-tunnus: {order.y_tunnus}</p>
            )}
          </div>
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Kohde</h2>
            <p className="font-medium text-gray-900">{order.osoite}</p>
            <p className="text-sm text-gray-600">{order.kaupunginosa}, {order.kaupunki}</p>
            <p className="text-sm text-gray-600 mt-1">{dateStr}, klo {timeStr}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8 flex gap-6 print:bg-gray-100">
          <div>
            <span className="text-2xl font-bold text-gray-900">{samples.length}</span>
            <p className="text-xs text-gray-500">näytettä</p>
          </div>
          {negativeCount > 0 && (
            <div>
              <span className="text-2xl font-bold text-green-600">{negativeCount}</span>
              <p className="text-xs text-gray-500">puhdasta</p>
            </div>
          )}
          {positiveCount > 0 && (
            <div>
              <span className="text-2xl font-bold text-red-600">{positiveCount}</span>
              <p className="text-xs text-gray-500">asbestia</p>
            </div>
          )}
          {pendingCount > 0 && (
            <div>
              <span className="text-2xl font-bold text-gray-400">{pendingCount}</span>
              <p className="text-xs text-gray-500">odottaa</p>
            </div>
          )}
        </div>

        {/* Samples */}
        {samples.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Ei näytteitä.</p>
        ) : (
          <div className="space-y-6">
            {samples.map((sample, index) => (
              <div key={sample.id} className="border rounded-lg p-4 break-inside-avoid">
                {/* Sample header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs text-gray-400 font-medium">Näyte {index + 1}</span>
                    <h3 className="font-semibold text-gray-900 text-lg">{sample.location}</h3>
                  </div>
                  <div>
                    {sample.asbestos_detected === true && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                        ASBESTI HAVAITTU
                      </span>
                    )}
                    {sample.asbestos_detected === false && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                        EI ASBESTIA
                      </span>
                    )}
                    {sample.asbestos_detected === null && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
                        ODOTTAA TULOKSIA
                      </span>
                    )}
                  </div>
                </div>

                {/* Asbestos type */}
                {sample.asbestos_detected === true && sample.asbestos_type && (
                  <p className="text-sm text-red-600 mb-2">Tyyppi: {sample.asbestos_type}</p>
                )}

                {/* Notes */}
                {sample.notes && (
                  <p className="text-sm text-gray-600 mb-3">{sample.notes}</p>
                )}

                {/* Lab notes */}
                {sample.lab_notes && (
                  <p className="text-sm text-gray-500 italic mb-3">Lab: {sample.lab_notes}</p>
                )}

                {/* Photos */}
                {sample.photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {sample.photos.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`${sample.location} kuva ${i + 1}`}
                        className="w-32 h-32 object-cover rounded-lg border print:w-28 print:h-28"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t text-center text-xs text-gray-400">
          <p>Suomen Asbestipro Oy</p>
          <p>Raportti luotu {new Date().toLocaleDateString('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>
    </div>
  );
}
