'use client';
import { adminFetch } from '@/lib/admin-fetch';

import { useEffect, useState, useCallback } from 'react';
import type { Order } from '@/lib/supabase';
import Link from 'next/link';

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-700';
    case 'unpaid': return 'bg-blue-100 text-blue-700';
    case 'partial':
    case 'incomplete':
    case 'failed': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'paid': return 'Paid';
    case 'unpaid': return 'Invoiced';
    case 'partial': return 'Partial';
    case 'incomplete':
    case 'failed': return 'Incomplete';
    default: return status;
  }
}

type SortKey = 'aika' | 'kaupunginosa' | 'nimi' | 'hinta' | 'payment_status';
type SortDir = 'asc' | 'desc';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('aika');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchOrders = useCallback(async () => {
    const res = await adminFetch('/api/orders');
    const data = await res.json();
    if (Array.isArray(data)) setOrders(data);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter((o) => o.aika?.startsWith(today));
  const paidOrders = orders.filter((o) => o.payment_status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.maksettu_summa || o.hinta || 0), 0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const recentOrders = [...orders]
    .sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      if (sortKey === 'hinta') {
        const diff = (a.hinta || 0) - (b.hinta || 0);
        return sortDir === 'asc' ? diff : -diff;
      }
      const diff = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? diff : -diff;
    })
    .slice(0, 10);

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
        <div className="bg-white rounded-xl border p-3 sm:p-5">
          <p className="text-[10px] sm:text-sm text-gray-500">Today</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5">{todayOrders.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 sm:p-5">
          <p className="text-[10px] sm:text-sm text-gray-500">Total Orders</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 sm:p-5">
          <p className="text-[10px] sm:text-sm text-gray-500">Revenue</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5">{totalRevenue.toLocaleString('fi-FI')} €</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
        <Link
          href="/admin/calendar"
          className="bg-blue-600 text-white rounded-xl p-3 sm:p-5 hover:bg-blue-700 transition"
        >
          <p className="font-medium text-sm sm:text-base">Calendar</p>
        </Link>
        <Link
          href="/admin/map"
          className="bg-gray-800 text-white rounded-xl p-3 sm:p-5 hover:bg-gray-900 transition"
        >
          <p className="font-medium text-sm sm:text-base">Map</p>
        </Link>
        <Link
          href="/admin/orders"
          className="bg-green-600 text-white rounded-xl p-3 sm:p-5 hover:bg-green-700 transition"
        >
          <p className="font-medium text-sm sm:text-base">Orders</p>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border">
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b">
          <h2 className="font-bold text-gray-900 text-sm sm:text-base">Recent Orders</h2>
        </div>

        {/* Mobile: card list */}
        <div className="sm:hidden divide-y">
          {recentOrders.map((o) => (
            <Link key={o.id} href={`/admin/order/${o.id}`} className="flex items-center justify-between px-3 py-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{o.kaupunginosa} — {o.nimi}</p>
                <p className="text-xs text-gray-500">
                  {new Date(o.aika).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="font-medium text-sm">{o.hinta} €</p>
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadgeClass(o.payment_status)}`}
                >
                  {getStatusLabel(o.payment_status)}
                </span>
              </div>
            </Link>
          ))}
          {recentOrders.length === 0 && (
            <p className="px-3 py-8 text-center text-gray-400 text-sm">No orders</p>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('aika')}>
                  Time{sortIndicator('aika')}
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('kaupunginosa')}>
                  District{sortIndicator('kaupunginosa')}
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('nimi')}>
                  Customer{sortIndicator('nimi')}
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('hinta')}>
                  Price{sortIndicator('hinta')}
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('payment_status')}>
                  Payment{sortIndicator('payment_status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="px-5 py-3 whitespace-nowrap">
                    {new Date(o.aika).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
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
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(o.payment_status)}`}
                    >
                      {getStatusLabel(o.payment_status)}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">No orders</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
