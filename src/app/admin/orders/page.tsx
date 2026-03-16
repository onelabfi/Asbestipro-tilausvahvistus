'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Order } from '@/lib/supabase';
import Link from 'next/link';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');

  const fetchOrders = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterCity) params.set('city', filterCity);
    if (filterStatus) params.set('status', filterStatus);

    const res = await fetch(`/api/orders?${params}`);
    const data = await res.json();
    if (Array.isArray(data)) setOrders(data);
  }, [filterCity, filterStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const cities = [...new Set(orders.map((o) => o.kaupunki))].filter(Boolean);

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Tilaukset</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="">Kaikki kaupungit</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="">Kaikki statukset</option>
          <option value="paid">Maksettu</option>
          <option value="pending">Odottaa</option>
          <option value="failed">Epäonnistunut</option>
        </select>
        <span className="text-sm text-gray-500 self-center ml-auto">
          {orders.length} tilausta
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Aika</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Kaupunginosa</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Asiakas</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Puhelin</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Hinta</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Maksu</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b hover:bg-gray-50">
                <td className="px-5 py-3 whitespace-nowrap">
                  {new Date(o.aika).toLocaleDateString('fi-FI', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-5 py-3">
                  <Link href={`/admin/order/${o.id}`} className="text-blue-600 hover:underline font-medium">
                    {o.kaupunginosa}
                  </Link>
                </td>
                <td className="px-5 py-3">{o.nimi}</td>
                <td className="px-5 py-3">
                  <a href={`tel:${o.puhelin}`} className="text-blue-600">{o.puhelin}</a>
                </td>
                <td className="px-5 py-3 font-medium">{o.hinta} €</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      o.payment_status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : o.payment_status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {o.payment_status === 'paid'
                      ? 'Maksettu'
                      : o.payment_status === 'failed'
                      ? 'Epäonnistunut'
                      : 'Odottaa'}
                  </span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  Ei tilauksia
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
