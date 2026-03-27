'use client';
import { adminFetch } from '@/lib/admin-fetch';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { Order, Sample } from '@/lib/supabase';
import { LabResultsForm } from '@/components/LabResultsForm';

type OrderWithSamples = Order & {
  samples: Sample[];
  sampleCount: number;
  resultsCount: number;
  asbestosCount: number;
  allResultsIn: boolean;
};

export default function ReportsPage() {
  const [orders, setOrders] = useState<OrderWithSamples[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ready' | 'pending'>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingSample, setEditingSample] = useState<Sample | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await adminFetch('/api/orders');
      if (!res.ok) return;
      const allOrders: Order[] = await res.json();

      const ordersWithSamples = await Promise.all(
        allOrders.map(async (order) => {
          const samplesRes = await adminFetch(`/api/orders/${order.id}/samples`);
          const samples: Sample[] = samplesRes.ok ? await samplesRes.json() : [];
          const resultsCount = samples.filter((s) => s.asbestos_detected !== null).length;
          const asbestosCount = samples.filter((s) => s.asbestos_detected === true).length;
          return {
            ...order,
            samples,
            sampleCount: samples.length,
            resultsCount,
            asbestosCount,
            allResultsIn: samples.length > 0 && resultsCount === samples.length,
          };
        })
      );

      setOrders(ordersWithSamples.filter((o) => o.sampleCount > 0));
    } catch {
      console.error('Failed to fetch reports data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveLabResults = async (
    orderId: string,
    sampleId: string,
    data: {
      asbestos_detected: boolean | null;
      asbestos_type: string | null;
      lab_notes: string | null;
      polyavyys: number | null;
    }
  ) => {
    const res = await adminFetch(`/api/orders/${orderId}/samples/${sampleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save');
    setEditingSample(null);
    await fetchData();
  };

  const filtered = orders.filter((o) => {
    if (filter === 'ready') return o.allResultsIn;
    if (filter === 'pending') return !o.allResultsIn;
    return true;
  });

  const readyCount = orders.filter((o) => o.allResultsIn).length;
  const pendingCount = orders.filter((o) => !o.allResultsIn).length;

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Ladataan...</div>;
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">Raportit</h1>
        <p className="text-sm text-gray-500">{orders.length} kartoitusta</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Kaikki ({orders.length})
        </button>
        <button
          onClick={() => setFilter('ready')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'ready' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          Valmis ({readyCount})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
          }`}
        >
          Odottaa ({pendingCount})
        </button>
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📄</p>
          <p>Ei kartoituksia</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const date = new Date(o.aika).toLocaleDateString('fi-FI', {
              day: 'numeric',
              month: 'numeric',
              year: 'numeric',
            });
            const isExpanded = expandedOrder === o.id;

            return (
              <div key={o.id} className="bg-white rounded-xl border overflow-hidden">
                {/* Order header — clickable to expand */}
                <button
                  onClick={() => {
                    setExpandedOrder(isExpanded ? null : o.id);
                    setEditingSample(null);
                  }}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {o.kaupunginosa || o.osoite}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {o.nimi} — {date}
                      </p>
                      <div className="flex gap-3 mt-2">
                        <span className="text-xs text-gray-500">{o.sampleCount} näytettä</span>
                        <span className="text-xs text-gray-500">
                          {o.resultsCount}/{o.sampleCount} tulosta
                        </span>
                        {o.asbestosCount > 0 && (
                          <span className="text-xs text-red-600 font-medium">
                            {o.asbestosCount} asbestia
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {o.allResultsIn ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                          Valmis
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                          {o.sampleCount - o.resultsCount} odottaa
                        </span>
                      )}
                      <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </button>

                {/* Expanded: sample list + lab results */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4">
                    {/* Samples */}
                    <div className="divide-y">
                      {o.samples.map((s, i) => {
                        const isEditing = editingSample?.id === s.id;

                        return (
                          <div key={s.id} className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs text-gray-400 font-mono w-5">{i + 1}</span>
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {s.location}
                                </span>
                                {s.area_m2 && (
                                  <span className="text-xs text-gray-400">{s.area_m2} m²</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                {/* Result badge */}
                                {s.asbestos_detected === true ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                                    {s.asbestos_type || 'Asbesti'}
                                    {s.polyavyys ? ` (P${s.polyavyys})` : ''}
                                  </span>
                                ) : s.asbestos_detected === false ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                    Puhdas
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                                    Odottaa
                                  </span>
                                )}
                                {/* Edit button */}
                                <button
                                  onClick={() => setEditingSample(isEditing ? null : s)}
                                  className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                                    isEditing
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {isEditing ? 'Sulje' : 'Tulokset'}
                                </button>
                              </div>
                            </div>

                            {/* Photos */}
                            {s.photos.length > 0 && (
                              <div className="flex gap-1.5 mt-2 ml-7 overflow-x-auto">
                                {s.photos.map((url, pi) => (
                                  <img
                                    key={pi}
                                    src={url}
                                    alt={`Kuva ${pi + 1}`}
                                    className="w-12 h-12 rounded object-cover border flex-shrink-0"
                                  />
                                ))}
                              </div>
                            )}

                            {/* Inline lab results form */}
                            {isEditing && (
                              <div className="mt-3 ml-7">
                                <LabResultsForm
                                  sample={s}
                                  onSave={(data) => handleSaveLabResults(o.id, s.id, data)}
                                  onCancel={() => setEditingSample(null)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Link
                        href={`/admin/order/${o.id}`}
                        className="flex-1 text-center text-xs py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium"
                      >
                        Tilaus
                      </Link>
                      <Link
                        href={`/admin/order/${o.id}/report`}
                        className={`flex-1 text-center text-xs py-2 rounded-lg font-medium ${
                          o.allResultsIn
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        onClick={(e) => {
                          if (!o.allResultsIn) e.preventDefault();
                        }}
                      >
                        {o.allResultsIn ? 'Avaa raportti' : 'Tulokset puuttuvat'}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
