'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Order } from '@/lib/supabase';
import Link from 'next/link';

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

type SortKey = 'aika' | 'kaupunginosa' | 'nimi' | 'puhelin' | 'hinta' | 'payment_status';
type SortDir = 'asc' | 'desc';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('aika');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (sortKey === 'hinta') {
        const diff = (a.hinta || 0) - (b.hinta || 0);
        return sortDir === 'asc' ? diff : -diff;
      }
      const aVal = String(a[sortKey] ?? '');
      const bVal = String(b[sortKey] ?? '');
      const diff = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [orders, sortKey, sortDir]);

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Invoiced</option>
          <option value="partial">Partial</option>
          <option value="incomplete">Incomplete</option>
        </select>
        <span className="text-sm text-gray-500 self-center ml-auto">
          {sortedOrders.length} orders
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
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
              <th className="text-left px-5 py-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('puhelin')}>
                Phone{sortIndicator('puhelin')}
              </th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('hinta')}>
                Price{sortIndicator('hinta')}
              </th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('payment_status')}>
                Payment{sortIndicator('payment_status')}
              </th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">
                Raportti
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((o) => (
              <tr key={o.id} className="border-b hover:bg-gray-50">
                <td className="px-5 py-3 whitespace-nowrap">
                  {new Date(o.aika).toLocaleDateString('en-GB', {
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
                  {o.puhelin ? (
                    <a href={`tel:${o.puhelin}`} className="text-blue-600">{o.puhelin}</a>
                  ) : '-'}
                </td>
                <td className="px-5 py-3 font-medium">{o.hinta} €</td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(o.payment_status)}`}>
                    {getStatusLabel(o.payment_status)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {o.report_sent_at ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                      ✓ Lähetetty {new Date(o.report_sent_at).toLocaleDateString('fi-FI')}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
            {sortedOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                  No orders
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
