'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Order } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (Array.isArray(data)) setOrders(data);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter((o) => o.aika?.startsWith(today));
  const paidOrders = orders.filter((o) => o.payment_status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.hinta || 0), 0);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Suomen Asbestipro Oy</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Tänään</p>
          <p className="text-2xl font-bold mt-1">{todayOrders.length}</p>
          <p className="text-xs text-gray-400 mt-1">tilausta</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Tilauksia yhteensä</p>
          <p className="text-2xl font-bold mt-1">{orders.length}</p>
          <p className="text-xs text-gray-400 mt-1">kpl</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Liikevaihto (maksettu)</p>
          <p className="text-2xl font-bold mt-1">{totalRevenue.toLocaleString('fi-FI')} €</p>
          <p className="text-xs text-gray-400 mt-1">{paidOrders.length} maksettua</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href="/admin/calendar"
          className="bg-blue-600 text-white rounded-xl p-5 hover:bg-blue-700 transition"
        >
          <p className="font-medium">Kalenteri</p>
          <p className="text-sm text-blue-200 mt-1">Näytä viikkonäkymä</p>
        </Link>
        <Link
          href="/admin/map"
          className="bg-gray-800 text-white rounded-xl p-5 hover:bg-gray-900 transition"
        >
          <p className="font-medium">Kartta</p>
          <p className="text-sm text-gray-400 mt-1">Kohteet kartalla</p>
        </Link>
        <Link
          href="/admin/orders"
          className="bg-green-600 text-white rounded-xl p-5 hover:bg-green-700 transition"
        >
          <p className="font-medium">Tilaukset</p>
          <p className="text-sm text-green-200 mt-1">Kaikki tilaukset</p>
        </Link>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-xl border">
        <div className="px-5 py-4 border-b">
          <h2 className="font-bold text-gray-900">Viimeisimmät tilaukset</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Aika</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Kaupunginosa</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Asiakas</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Hinta</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Maksu</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="px-5 py-3 whitespace-nowrap">
                    {new Date(o.aika).toLocaleDateString('fi-FI', {
                      day: 'numeric',
                      month: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/order/${o.id}`} className="text-blue-600 hover:underline">
                      {o.kaupunginosa}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{o.nimi}</td>
                  <td className="px-5 py-3 font-medium">{o.hinta} €</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        o.payment_status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : o.payment_status === 'manual'
                          ? 'bg-yellow-100 text-yellow-700'
                          : o.payment_status === 'failed' || o.payment_status === 'unpaid'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {o.payment_status === 'paid'
                        ? 'Maksettu'
                        : o.payment_status === 'manual'
                        ? 'Manuaalinen'
                        : o.payment_status === 'failed' || o.payment_status === 'unpaid'
                        ? 'Maksamaton'
                        : 'Odottaa'}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    Ei tilauksia
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
