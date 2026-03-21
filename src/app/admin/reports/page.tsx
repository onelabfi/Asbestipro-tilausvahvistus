'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { Order, Sample } from '@/lib/supabase';

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

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return;
      const allOrders: Order[] = await res.json();

      // Fetch samples for each order that has samples
      const ordersWithSamples = await Promise.all(
        allOrders.map(async (order) => {
          const samplesRes = await fetch(`/api/orders/${order.id}/samples`);
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

      // Only show orders that have at least 1 sample
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

  const filtered = orders.filter((o) => {
    if (filter === 'ready') return o.allResultsIn;
    if (filter === 'pending') return !o.allResultsIn;
    return true;
  });

  const readyCount = orders.filter((o) => o.allResultsIn).length;
  const pendingCount = orders.filter((o) => !o.allResultsIn).length;

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">Ladataan...</div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">Raportit</h1>
        <p className="text-sm text-gray-500">
          {orders.length} kartoitusta
        </p>
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

            return (
              <div
                key={o.id}
                className="bg-white rounded-xl border p-4"
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
                      <span className="text-xs text-gray-500">
                        {o.sampleCount} näytettä
                      </span>
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
                    {/* Status badge */}
                    {o.allResultsIn ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                        Valmis
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                        {o.sampleCount - o.resultsCount} odottaa
                      </span>
                    )}
                  </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
