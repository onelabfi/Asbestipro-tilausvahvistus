'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { Order } from '@/lib/supabase';

function getStatusColor(status: string) {
  switch (status) {
    case 'paid': return '#22c55e';      // green
    case 'unpaid': return '#3b82f6';    // blue (invoice)
    case 'manual': return '#eab308';    // yellow
    case 'incomplete':
    case 'failed': return '#ef4444';    // red
    default: return '#6b7280';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'paid': return 'Maksettu';
    case 'unpaid': return 'Lasku (maksamaton)';
    case 'manual': return 'Manuaalinen';
    case 'incomplete':
    case 'failed': return 'Puutteellinen';
    default: return status;
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-700';
    case 'unpaid': return 'bg-blue-100 text-blue-700';
    case 'manual': return 'bg-yellow-100 text-yellow-700';
    case 'incomplete':
    case 'failed': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

type ManualEventForm = {
  date: string;
  time: string;
  kaupunginosa: string;
  osoite: string;
  kaupunki: string;
  nimi: string;
  puhelin: string;
  remontti: string;
  hinta: string;
  notes: string;
};

const emptyForm: ManualEventForm = {
  date: '',
  time: '09:00',
  kaupunginosa: '',
  osoite: '',
  kaupunki: '',
  nimi: '',
  puhelin: '',
  remontti: '',
  hinta: '',
  notes: '',
};

// Generate 30-min time slots from 07:00 to 19:00
const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 19; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 19) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

// Detect mobile
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

export default function CalendarPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<ManualEventForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [markingPaid, setMarkingPaid] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const isMobile = useIsMobile();

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (Array.isArray(data)) setOrders(data);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const events = orders.map((o) => ({
    id: o.id,
    title: `${o.kaupunginosa} - ${o.nimi}`,
    start: o.aika,
    end: new Date(new Date(o.aika).getTime() + 30 * 60 * 1000).toISOString(),
    backgroundColor: getStatusColor(o.payment_status),
    borderColor: 'transparent',
    extendedProps: o,
  }));

  // Drag & drop event move
  const handleEventDrop = async (info: { event: { id: string; start: Date | null }; revert: () => void }) => {
    const eventId = info.event.id;
    const newStart = info.event.start;
    if (!newStart) { info.revert(); return; }

    const newAika = newStart.toISOString();

    try {
      const res = await fetch(`/api/orders/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aika: newAika }),
      });
      if (!res.ok) {
        info.revert();
        return;
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === eventId ? { ...o, aika: newAika } : o))
      );
    } catch {
      info.revert();
    }
  };

  // Save manual event
  const handleSaveManualEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time || !form.kaupunginosa) return;
    setSaving(true);

    const aika = `${form.date}T${form.time}:00`;

    try {
      const { date: _d, time: _t, ...rest } = form;
      void _d; void _t;
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rest,
          aika,
          hinta: parseFloat(form.hinta) || 0,
          palvelu: 'Asbesti- ja haitta-ainekartoitus',
        }),
      });

      if (res.ok) {
        setShowAddForm(false);
        setForm(emptyForm);
        fetchOrders();
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Save notes
  const handleSaveNotes = async () => {
    if (!selected) return;

    try {
      const res = await fetch(`/api/orders/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === selected.id ? { ...o, notes: notesValue } : o))
        );
        setSelected({ ...selected, notes: notesValue });
        setEditingNotes(false);
      }
    } catch (err) {
      console.error('Notes save error:', err);
    }
  };

  // Mark as paid
  const handleMarkPaid = async () => {
    if (!selected) return;
    setMarkingPaid(true);

    try {
      const res = await fetch(`/api/orders/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'paid', payment_method: 'manual' }),
      });

      if (res.ok) {
        const updated = { ...selected, payment_status: 'paid', payment_method: 'manual' };
        setOrders((prev) =>
          prev.map((o) => (o.id === selected.id ? { ...o, payment_status: 'paid', payment_method: 'manual' } : o))
        );
        setSelected(updated);
      }
    } catch (err) {
      console.error('Mark paid error:', err);
    } finally {
      setMarkingPaid(false);
    }
  };

  // Route planning — build Google Maps URL for all events on a given day
  const handleShowRoute = () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;

    const currentDate = api.getDate();
    const dateStr = currentDate.toISOString().split('T')[0];

    const dayOrders = orders
      .filter((o) => o.aika.startsWith(dateStr))
      .sort((a, b) => a.aika.localeCompare(b.aika));

    if (dayOrders.length === 0) {
      alert('Ei tapahtumia tänä päivänä.');
      return;
    }

    const addresses = dayOrders.map((o) => {
      if (o.latitude && o.longitude) return `${o.latitude},${o.longitude}`;
      return encodeURIComponent(`${o.osoite}, ${o.kaupunki}`);
    });

    if (addresses.length === 1) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${addresses[0]}`, '_blank');
      return;
    }

    const origin = addresses[0];
    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(1, -1).join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) url += `&waypoints=${waypoints}`;

    window.open(url, '_blank');
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Kalenteri</h1>
        <div className="flex gap-2">
          <button
            onClick={handleShowRoute}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            Päivän reitti
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
          >
            <span className="text-lg leading-none">+</span>
            Lisää tapahtuma
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          Maksettu
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
          Lasku
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
          Manuaalinen
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          Puutteellinen
        </div>
      </div>

      <div className="bg-white rounded-xl border p-2 sm:p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: isMobile ? 'timeGridDay,listWeek' : 'timeGridDay,timeGridWeek,dayGridMonth',
          }}
          locale="fi"
          firstDay={1}
          events={events}
          editable={true}
          droppable={true}
          snapDuration="00:30:00"
          slotDuration="00:30:00"
          eventDrop={handleEventDrop}
          eventClick={(info) => {
            const order = info.event.extendedProps as Order;
            setSelected(order);
            setNotesValue(order.notes || '');
            setEditingNotes(false);
          }}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          eventContent={(arg) => (
            <div className="px-1 py-0.5 text-xs truncate">
              <span className="font-medium">{arg.event.title}</span>
            </div>
          )}
        />
      </div>

      {/* Event Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-w-md w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold">{selected.kaupunginosa}</h2>
                <p className="text-sm text-gray-500">
                  {new Date(selected.aika).toLocaleDateString('fi-FI', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl p-1"
              >
                &times;
              </button>
            </div>

            {/* Payment status badge */}
            <div className="mb-4">
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(selected.payment_status)}`}>
                {getStatusLabel(selected.payment_status)}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-500">Asiakas</span>
                  <p className="font-medium">{selected.nimi || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Puhelin</span>
                  <p className="font-medium">
                    {selected.puhelin ? (
                      <a href={`tel:${selected.puhelin}`} className="text-blue-600">{selected.puhelin}</a>
                    ) : '-'}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Osoite</span>
                <p className="font-medium">
                  {selected.osoite}{selected.kaupunginosa ? `, ${selected.kaupunginosa}` : ''}{selected.kaupunki ? `, ${selected.kaupunki}` : ''}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-500">Remontti</span>
                  <p className="font-medium">{selected.remontti || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Hinta</span>
                  <p className="font-medium">{selected.hinta} €</p>
                </div>
              </div>

              {/* Notes section */}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500 font-medium">Muistiinpanot</span>
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
                      className="w-full border rounded-lg p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Lisää muistiinpano..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveNotes}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700"
                      >
                        Tallenna
                      </button>
                      <button
                        onClick={() => {
                          setEditingNotes(false);
                          setNotesValue(selected.notes || '');
                        }}
                        className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200"
                      >
                        Peruuta
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selected.notes || <span className="text-gray-400 italic">Ei muistiinpanoja</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 space-y-2">
              {/* Mark as paid button — only for unpaid/invoice orders */}
              {selected.payment_status !== 'paid' && (
                <button
                  onClick={handleMarkPaid}
                  disabled={markingPaid}
                  className="block w-full text-center bg-green-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {markingPaid ? 'Päivitetään...' : 'Merkitse maksetuksi'}
                </button>
              )}
              {selected.puhelin && (
                <a
                  href={`tel:${selected.puhelin}`}
                  className="block w-full text-center bg-gray-800 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-900"
                >
                  Soita asiakkaalle
                </a>
              )}
              {(selected.latitude && selected.longitude) ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Avaa Google Maps
                </a>
              ) : selected.osoite ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selected.osoite + ', ' + selected.kaupunki)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Avaa Google Maps
                </a>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Event Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setShowAddForm(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-w-lg w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold">Lisää tapahtuma</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveManualEvent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Päivä *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kellonaika *
                  </label>
                  <select
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kaupunginosa *
                  </label>
                  <input
                    type="text"
                    value={form.kaupunginosa}
                    onChange={(e) => setForm({ ...form, kaupunginosa: e.target.value })}
                    required
                    placeholder="esim. Töölö"
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kaupunki
                  </label>
                  <input
                    type="text"
                    value={form.kaupunki}
                    onChange={(e) => setForm({ ...form, kaupunki: e.target.value })}
                    placeholder="esim. Helsinki"
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Osoite
                </label>
                <input
                  type="text"
                  value={form.osoite}
                  onChange={(e) => setForm({ ...form, osoite: e.target.value })}
                  placeholder="esim. Mannerheimintie 1"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asiakkaan nimi
                  </label>
                  <input
                    type="text"
                    value={form.nimi}
                    onChange={(e) => setForm({ ...form, nimi: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Puhelin
                  </label>
                  <input
                    type="tel"
                    value={form.puhelin}
                    onChange={(e) => setForm({ ...form, puhelin: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remontin kuvaus
                </label>
                <input
                  type="text"
                  value={form.remontti}
                  onChange={(e) => setForm({ ...form, remontti: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hinta (€)
                </label>
                <input
                  type="number"
                  value={form.hinta}
                  onChange={(e) => setForm({ ...form, hinta: e.target.value })}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Muistiinpanot
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="esim. näyte otettu kylpyhuoneesta"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Tallennetaan...' : 'Tallenna'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  Peruuta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
