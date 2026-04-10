'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Order } from '@/lib/supabase';

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

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

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

  const handleResendConfirmation = async () => {
    if (!order) return;
    setResending(true);
    setResendStatus('idle');
    try {
      const res = await fetch(`/api/orders/${order.id}/resend-confirmation`, { method: 'POST' });
      setResendStatus(res.ok ? 'sent' : 'error');
    } catch {
      setResendStatus('error');
    } finally {
      setResending(false);
    }
  };

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

  const startEditing = () => {
    if (!order) return;
    const d = new Date(order.aika);
    setEditForm({
      nimi: order.nimi || '',
      puhelin: order.puhelin || '',
      email: order.email || '',
      osoite: order.osoite || '',
      kaupunginosa: order.kaupunginosa || '',
      kaupunki: order.kaupunki || '',
      postinumero: order.postinumero || '',
      remontti: order.remontti || '',
      hinta: String(order.hinta || ''),
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      notes: order.notes || '',
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!order) return;
    setSavingEdit(true);
    try {
      const localDate = new Date(`${editForm.date}T${editForm.time}:00`);
      const aika = localDate.toISOString();
      const body = {
        nimi: editForm.nimi,
        puhelin: editForm.puhelin,
        email: editForm.email,
        osoite: editForm.osoite,
        kaupunginosa: editForm.kaupunginosa,
        kaupunki: editForm.kaupunki,
        postinumero: editForm.postinumero,
        remontti: editForm.remontti,
        hinta: parseFloat(editForm.hinta) || 0,
        aika,
        notes: editForm.notes,
      };
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
        setNotesValue(updated.notes || '');
        setEditing(false);
      }
    } catch (err) {
      console.error('Edit save error:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Order not found.</p>
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
    hour12: false,
  });

  const remaining = (order.hinta || 0) - (order.maksettu_summa || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <button onClick={() => window.history.back()} className="text-blue-600 text-sm font-medium">
          &larr; Back
        </button>
        <h1 className="text-lg font-bold">Order</h1>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{order.kaupunginosa}</h2>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(order.payment_status)}`}>
                {getStatusLabel(order.payment_status)}
              </span>
              {!editing && (
                <button onClick={startEditing} className="text-blue-600 text-xs font-medium hover:underline">
                  Edit
                </button>
              )}
            </div>
          </div>

          <hr />

          {editing ? (
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-500 mb-1">Customer</label>
                <input type="text" value={editForm.nimi} onChange={(e) => setEditForm({ ...editForm, nimi: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1">Phone</label>
                  <input type="tel" value={editForm.puhelin} onChange={(e) => setEditForm({ ...editForm, puhelin: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Email</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Address</label>
                <input type="text" value={editForm.osoite} onChange={(e) => setEditForm({ ...editForm, osoite: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1">District</label>
                  <input type="text" value={editForm.kaupunginosa} onChange={(e) => setEditForm({ ...editForm, kaupunginosa: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">City</label>
                  <input type="text" value={editForm.kaupunki} onChange={(e) => setEditForm({ ...editForm, kaupunki: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Postcode</label>
                  <input type="text" value={editForm.postinumero} onChange={(e) => setEditForm({ ...editForm, postinumero: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1">Date</label>
                  <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Time</label>
                  <input type="time" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1">Price (€)</label>
                  <input type="number" value={editForm.hinta} onChange={(e) => setEditForm({ ...editForm, hinta: e.target.value })} min="0" step="0.01" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Renovation</label>
                  <input type="text" value={editForm.remontti} onChange={(e) => setEditForm({ ...editForm, remontti: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Notes</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
          <div className="grid gap-4 text-sm">
            <div>
              <span className="text-gray-500">Customer</span>
              <p className="font-medium text-base">{order.nimi || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Phone</span>
              <p className="font-medium">
                {order.puhelin ? (
                  <a href={`tel:${order.puhelin}`} className="text-blue-600">{order.puhelin}</a>
                ) : '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Email</span>
              <p className="font-medium">
                {order.email ? (
                  <a href={`mailto:${order.email}`} className="text-blue-600">{order.email}</a>
                ) : '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Address</span>
              <p className="font-medium">{order.osoite || '-'}</p>
              <p className="text-gray-600">
                {order.kaupunginosa}{order.kaupunki ? `, ${order.kaupunki}` : ''}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Time</span>
              <p className="font-medium">{aikaStr}</p>
            </div>
            <div>
              <span className="text-gray-500">Renovation</span>
              <p className="font-medium">{order.remontti || '-'}</p>
            </div>

            {/* Payment details */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Agreed Price</span>
                <span className="font-medium">{(order.hinta || 0).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid</span>
                <span className="font-medium">{(order.maksettu_summa || 0).toFixed(2)} €</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between border-t pt-1">
                  <span className="text-red-600 font-medium">Remaining</span>
                  <span className="text-red-600 font-bold">{remaining.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-gray-400 pt-1">
                <span>Method</span>
                <span className="capitalize">{order.payment_method || '-'}</span>
              </div>
            </div>

            {order.customer_type === 'company' && order.y_tunnus && (
              <div>
                <span className="text-gray-500">Business ID (Y-tunnus)</span>
                <p className="font-medium">{order.y_tunnus}</p>
              </div>
            )}
            {order.billing_address && (
              <div>
                <span className="text-gray-500">Billing Address</span>
                <p className="font-medium">{order.billing_address}</p>
              </div>
            )}
          </div>
          )}

          <hr />

          {/* Notes */}
          {!editing && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 font-medium">Notes</span>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-blue-600 text-xs hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="w-full border rounded-lg p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a note..."
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveNotes}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false);
                      setNotesValue(order.notes || '');
                    }}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 min-h-[40px]">
                {order.notes || <span className="text-gray-400 italic">No notes</span>}
              </p>
            )}
          </div>
          )}

          <hr />

          <div className="space-y-2">
            {/* Resend confirmation email */}
            <button
              onClick={handleResendConfirmation}
              disabled={resending}
              className="block w-full text-center bg-green-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {resending ? 'Lähetetään...' : 'Lähetä vahvistus uudelleen'}
            </button>
            {resendStatus === 'sent' && (
              <p className="text-center text-green-600 text-xs">✓ Vahvistus lähetetty asiakkaalle</p>
            )}
            {resendStatus === 'error' && (
              <p className="text-center text-red-600 text-xs">Lähetys epäonnistui. Yritä uudelleen.</p>
            )}

            {(order.latitude && order.longitude) ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Open Google Maps
              </a>
            ) : order.osoite ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.osoite + ', ' + order.kaupunki)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Open Google Maps
              </a>
            ) : null}
            {order.puhelin && (
              <a
                href={`tel:${order.puhelin}`}
                className="block w-full text-center bg-gray-800 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-900"
              >
                Call Customer
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
