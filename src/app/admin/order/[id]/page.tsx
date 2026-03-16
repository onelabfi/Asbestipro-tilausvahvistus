'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Order } from '@/lib/supabase';

function getStatusLabel(status: string) {
  switch (status) {
    case 'paid': return 'Maksettu';
    case 'manual': return 'Manuaalinen';
    case 'unpaid':
    case 'failed': return 'Maksamaton';
    default: return status;
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-700';
    case 'manual': return 'bg-yellow-100 text-yellow-700';
    case 'unpaid':
    case 'failed': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/orders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setNotesValue(data.notes || '');
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  const handleSaveNotes = async () => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue }),
      });
      if (res.ok) {
        setOrder({ ...order, notes: notesValue });
        setEditingNotes(false);
      }
    } catch (err) {
      console.error('Notes save error:', err);
    }
  };

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
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(order.payment_status)}`}>
              {getStatusLabel(order.payment_status)}
            </span>
          </div>

          <hr />

          <div className="grid gap-4 text-sm">
            <div>
              <span className="text-gray-500">Asiakas</span>
              <p className="font-medium text-base">{order.nimi || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Puhelin</span>
              <p className="font-medium">
                {order.puhelin ? (
                  <a href={`tel:${order.puhelin}`} className="text-blue-600">{order.puhelin}</a>
                ) : '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Sähköposti</span>
              <p className="font-medium">
                {order.email ? (
                  <a href={`mailto:${order.email}`} className="text-blue-600">{order.email}</a>
                ) : '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Osoite</span>
              <p className="font-medium">{order.osoite || '-'}</p>
              <p className="text-gray-600">
                {order.kaupunginosa}{order.kaupunki ? `, ${order.kaupunki}` : ''}
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

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 font-medium">Muistiinpanot</span>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-blue-600 text-xs hover:underline"
                >
                  Muokkaa
                </button>
              )}
            </div>
            {editingNotes ? (
              <div>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="w-full border rounded-lg p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lisää muistiinpano..."
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveNotes}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-700"
                  >
                    Tallenna
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false);
                      setNotesValue(order.notes || '');
                    }}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-200"
                  >
                    Peruuta
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 min-h-[40px]">
                {order.notes || <span className="text-gray-400 italic">Ei muistiinpanoja</span>}
              </p>
            )}
          </div>

          <hr />

          <div className="space-y-2">
            {(order.latitude && order.longitude) ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Avaa Google Maps
              </a>
            ) : order.osoite ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.osoite + ', ' + order.kaupunki)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Avaa Google Maps
              </a>
            ) : null}
            {order.puhelin && (
              <a
                href={`tel:${order.puhelin}`}
                className="block w-full text-center bg-gray-800 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-900"
              >
                Soita asiakkaalle
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
