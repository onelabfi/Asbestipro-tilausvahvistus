'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { Order } from '@/lib/supabase';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { DistrictAutocomplete } from '@/components/DistrictAutocomplete';
import { SurveyView } from '@/components/SurveyView';

// ── Week helpers ──────────────────────────────────────────────────────
function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekRange(d: Date): { start: Date; end: Date } {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function formatWeekHeader(d: Date): string {
  const wk = getISOWeek(d);
  const { start, end } = getWeekRange(d);
  const sameMonth = start.getMonth() === end.getMonth();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (sameMonth) {
    return `Week ${wk} — ${monthNames[start.getMonth()]} ${start.getDate()}–${end.getDate()}`;
  }
  return `Week ${wk} — ${monthNames[start.getMonth()]} ${start.getDate()} – ${monthNames[end.getMonth()]} ${end.getDate()}`;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'paid': return '#22c55e';       // green
    case 'unpaid': return '#3b82f6';     // blue (invoiced)
    case 'partial':
    case 'incomplete':
    case 'failed': return '#ef4444';     // red
    default: return '#6b7280';
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

type ManualEventForm = {
  date: string;
  time: string;
  kaupunginosa: string;
  osoite: string;
  postinumero: string;
  kaupunki: string;
  latitude: number;
  longitude: number;
  nimi: string;
  puhelin: string;
  email: string;
  remontti: string;
  hinta: string;
  notes: string;
};

const emptyForm: ManualEventForm = {
  date: '',
  time: '09:00',
  kaupunginosa: '',
  osoite: '',
  postinumero: '',
  kaupunki: '',
  latitude: 0,
  longitude: 0,
  nimi: '',
  puhelin: '',
  email: '',
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
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [editingOrder, setEditingOrder] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [sampleCounts, setSampleCounts] = useState<Record<string, number>>({});
  const calendarRef = useRef<FullCalendar>(null);
  const calendarWrapRef = useRef<HTMLDivElement>(null);
  const swipeInnerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Track current date for week header
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekHeader = useMemo(() => formatWeekHeader(currentDate), [currentDate]);

  // Smooth drag-based swipe for mobile
  useEffect(() => {
    if (!isMobile) return;
    const el = calendarWrapRef.current;
    const inner = swipeInnerRef.current;
    if (!el || !inner) return;

    let startX = 0;
    let startY = 0;
    let dragX = 0;
    let isDragging = false;
    let isHorizontal: boolean | null = null;
    let animating = false;

    const THRESHOLD = 0.3; // 30% of container width
    const ANIM_MS = 280;

    const onTouchStart = (e: TouchEvent) => {
      if (animating) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dragX = 0;
      isDragging = false;
      isHorizontal = null;
      inner.style.transition = 'none';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (animating) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      // Lock direction on first meaningful move
      if (isHorizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        isHorizontal = Math.abs(dx) > Math.abs(dy);
      }

      if (!isHorizontal) return;

      // Prevent vertical scroll while swiping
      e.preventDefault();
      isDragging = true;
      dragX = dx;

      // Apply dampening at edges (rubber-band feel)
      const dampened = dragX * 0.85;
      inner.style.transform = `translateX(${dampened}px)`;
    };

    const onTouchEnd = () => {
      if (animating || !isDragging) {
        inner.style.transition = '';
        inner.style.transform = '';
        return;
      }

      const width = el.offsetWidth;
      const ratio = Math.abs(dragX) / width;
      const api = calendarRef.current?.getApi();

      if (ratio > THRESHOLD && api) {
        // Slide out in the drag direction
        animating = true;
        const direction = dragX > 0 ? 1 : -1;
        inner.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
        inner.style.transform = `translateX(${direction * width}px)`;

        setTimeout(() => {
          // Navigate
          if (direction > 0) api.prev();
          else api.next();

          // Slide in from opposite side
          inner.style.transition = 'none';
          inner.style.transform = `translateX(${-direction * width * 0.4}px)`;

          // Force reflow
          void inner.offsetHeight;

          inner.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
          inner.style.transform = 'translateX(0px)';

          setTimeout(() => {
            inner.style.transition = '';
            inner.style.transform = '';
            animating = false;
          }, ANIM_MS);
        }, ANIM_MS);
      } else {
        // Snap back
        inner.style.transition = `transform ${200}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
        inner.style.transform = 'translateX(0px)';
        setTimeout(() => {
          inner.style.transition = '';
          inner.style.transform = '';
        }, 200);
      }

      isDragging = false;
      isHorizontal = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile]);

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (Array.isArray(data)) setOrders(data);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const events = orders.map((o) => {
    const district = o.kaupunginosa || o.kaupunki || '';
    const phone = o.puhelin || '';
    const title = district
      ? `${district}${phone ? ` 📞 ${phone}` : ''}`
      : `⚠ No location${phone ? ` 📞 ${phone}` : ''}`;
    return {
      id: o.id,
      title,
      start: o.aika,
      end: new Date(new Date(o.aika).getTime() + 25 * 60 * 1000).toISOString(),
      backgroundColor: getStatusColor(o.payment_status),
      borderColor: 'transparent',
      extendedProps: o,
    };
  });

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
    if (!form.date || !form.time || !form.puhelin) return;
    setSaving(true);

    // Build a proper local time and convert to ISO with timezone offset
    const localDate = new Date(`${form.date}T${form.time}:00`);
    const aika = localDate.toISOString();

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kaupunginosa: form.kaupunginosa || '',
          kaupunki: form.kaupunki || '',
          osoite: form.osoite || '',
          postinumero: form.postinumero || '',
          latitude: form.latitude || 0,
          longitude: form.longitude || 0,
          nimi: form.nimi || '',
          puhelin: form.puhelin,
          email: form.email || '',
          remontti: form.remontti || '',
          notes: form.notes || '',
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

  // Mark as paid (override)
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
        const data = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === selected.id ? data : o))
        );
        setSelected(data);
      }
    } catch (err) {
      console.error('Mark paid error:', err);
    } finally {
      setMarkingPaid(false);
    }
  };

  // Add partial payment
  const handleAddPayment = async () => {
    if (!selected || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    setAddingPayment(true);
    try {
      const res = await fetch(`/api/orders/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add_payment: amount }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === selected.id ? data : o))
        );
        setSelected(data);
        setShowAddPayment(false);
        setPaymentAmount('');
      }
    } catch (err) {
      console.error('Add payment error:', err);
    } finally {
      setAddingPayment(false);
    }
  };

  // Delete event
  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/orders/${selected.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== selected.id));
        setSelected(null);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const startEditingOrder = () => {
    if (!selected) return;
    const d = new Date(selected.aika);
    setEditForm({
      nimi: selected.nimi || '',
      puhelin: selected.puhelin || '',
      email: selected.email || '',
      osoite: selected.osoite || '',
      kaupunginosa: selected.kaupunginosa || '',
      kaupunki: selected.kaupunki || '',
      postinumero: selected.postinumero || '',
      remontti: selected.remontti || '',
      hinta: String(selected.hinta || ''),
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      notes: selected.notes || '',
    });
    setEditingOrder(true);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
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
      const res = await fetch(`/api/orders/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === selected.id ? updated : o)));
        setSelected(updated);
        setEditingOrder(false);
      }
    } catch (err) {
      console.error('Edit save error:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const remaining = selected ? (selected.hinta || 0) - (selected.maksettu_summa || 0) : 0;

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
            Paid
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            Invoiced
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            Incomplete
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1 shrink-0"
        >
          <span className="text-base leading-none">+</span>
          <span className="hidden sm:inline">Add Event</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Week context header (mobile) */}
      {isMobile && (
        <div className="mb-2 px-1">
          <div className="text-sm font-semibold text-gray-700 tracking-tight">
            {weekHeader}
          </div>
        </div>
      )}

      <div ref={calendarWrapRef} className="bg-white rounded-xl border p-1 sm:p-4 overflow-hidden">
        <div ref={swipeInnerRef} className="will-change-transform">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
            headerToolbar={isMobile
              ? { left: 'prev,next today', center: 'title', right: '' }
              : { left: 'prev,next today', center: 'title', right: 'timeGridDay,timeGridWeek,dayGridMonth' }
            }
            datesSet={(info) => {
              // Track the current visible date for the week header
              setCurrentDate(info.start);
            }}
            locale="en"
            firstDay={1}
            events={events}
            editable={true}
            droppable={true}
            snapDuration="00:30:00"
            slotDuration="00:30:00"
            eventDrop={handleEventDrop}
            dateClick={(info) => {
              const d = info.date;
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
              setForm({ ...emptyForm, date: dateStr, time: timeStr });
              setShowAddForm(true);
            }}
            eventClick={(info) => {
              const order = info.event.extendedProps as Order;
              setSelected(order);
              setNotesValue(order.notes || '');
              setEditingNotes(false);
              setShowAddPayment(false);
              setShowDeleteConfirm(false);
              // Fetch sample count for this order
              fetch(`/api/orders/${order.id}/samples`)
                .then(r => r.ok ? r.json() : [])
                .then(data => setSampleCounts(prev => ({ ...prev, [order.id]: Array.isArray(data) ? data.length : 0 })))
                .catch(() => {});
            }}
            height="auto"
            slotMinTime="06:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            eventContent={(arg) => {
              const o = arg.event.extendedProps as Order;
              const district = o.kaupunginosa || o.kaupunki || '';
              const phone = o.puhelin || '';
              return (
                <div className="px-1 py-0.5 text-xs leading-tight overflow-hidden">
                  <div className="font-semibold truncate">
                    {district || <span className="text-yellow-200">⚠ No location</span>}
                  </div>
                  {phone && (
                    <div className="opacity-80 truncate">📞 {phone}</div>
                  )}
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* Event Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => { setSelected(null); setEditingOrder(false); }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-w-md w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold">{selected.kaupunginosa || selected.kaupunki || 'No location'}</h2>
                <p className="text-sm text-gray-500">
                  {new Date(selected.aika).toLocaleDateString('fi-FI', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!editingOrder && (
                  <button
                    onClick={startEditingOrder}
                    className="text-blue-600 text-xs font-medium hover:underline"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => { setSelected(null); setEditingOrder(false); }}
                  className="text-gray-400 hover:text-gray-600 text-2xl p-1"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Payment status badge */}
            <div className="mb-4">
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(selected.payment_status)}`}>
                {getStatusLabel(selected.payment_status)}
              </span>
            </div>

            {editingOrder ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 mb-1">Customer</label>
                    <input type="text" value={editForm.nimi} onChange={(e) => setEditForm({ ...editForm, nimi: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Phone</label>
                    <input type="tel" value={editForm.puhelin} onChange={(e) => setEditForm({ ...editForm, puhelin: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Email</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                    <select value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
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
                  <button onClick={() => setEditingOrder(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-500">Customer</span>
                  <p className="font-medium">{selected.nimi || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone</span>
                  <p className="font-medium">
                    {selected.puhelin ? (
                      <a href={`tel:${selected.puhelin}`} className="text-blue-600">{selected.puhelin}</a>
                    ) : '-'}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Address</span>
                <p className="font-medium">
                  {selected.osoite}{selected.kaupunginosa ? `, ${selected.kaupunginosa}` : ''}{selected.kaupunki ? `, ${selected.kaupunki}` : ''}
                </p>
              </div>

              {/* Payment details */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Agreed Price</span>
                  <span className="font-medium">{(selected.hinta || 0).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid</span>
                  <span className="font-medium">{(selected.maksettu_summa || 0).toFixed(2)} €</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-red-600 font-medium">Remaining</span>
                    <span className="text-red-600 font-bold">{remaining.toFixed(2)} €</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-500">Renovation</span>
                  <p className="font-medium">{selected.remontti || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Method</span>
                  <p className="font-medium capitalize">{selected.payment_method || '-'}</p>
                </div>
              </div>

              {/* Notes section */}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500 font-medium">Notes</span>
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
                      className="w-full border rounded-lg p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a note..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveNotes}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingNotes(false);
                          setNotesValue(selected.notes || '');
                        }}
                        className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selected.notes || <span className="text-gray-400 italic">No notes</span>}
                  </p>
                )}
              </div>
            </div>
            )}

            {/* Survey section */}
            <div className="mt-4 bg-blue-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-gray-900">📋 Kartoitus</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(sampleCounts[selected.id] || 0) === 0
                      ? 'Ei näytteitä vielä'
                      : `${sampleCounts[selected.id]} näytettä`}
                  </p>
                </div>
                <button
                  onClick={() => setShowSurvey(true)}
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  {(sampleCounts[selected.id] || 0) === 0 ? 'Aloita kartoitus' : `Näytä (${sampleCounts[selected.id]})`}
                </button>
              </div>
            </div>

            {/* Add payment inline form */}
            {showAddPayment && (
              <div className="mt-4 bg-gray-50 rounded-lg p-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (€)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={remaining > 0 ? remaining.toFixed(2) : '0'}
                    min="0"
                    step="0.01"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddPayment}
                    disabled={addingPayment}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {addingPayment ? '...' : 'Add'}
                  </button>
                  <button
                    onClick={() => { setShowAddPayment(false); setPaymentAmount(''); }}
                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="mt-4 bg-red-50 rounded-lg p-3">
                <p className="text-sm text-red-700 mb-2">Are you sure you want to delete this event?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 space-y-2">
              {/* Add payment button */}
              {selected.payment_status !== 'paid' && !showAddPayment && (
                <button
                  onClick={() => setShowAddPayment(true)}
                  className="block w-full text-center bg-orange-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-orange-600"
                >
                  Add Payment
                </button>
              )}
              {/* Mark as paid (override) */}
              {selected.payment_status !== 'paid' && (
                <button
                  onClick={handleMarkPaid}
                  disabled={markingPaid}
                  className="block w-full text-center bg-green-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {markingPaid ? 'Updating...' : 'Mark as Paid'}
                </button>
              )}
              {selected.puhelin && (
                <a
                  href={`tel:${selected.puhelin}`}
                  className="block w-full text-center bg-gray-800 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-900"
                >
                  Call Customer
                </a>
              )}
              {selected.puhelin && selected.payment_status !== 'paid' && (
                <a
                  href={`sms:${selected.puhelin}?body=${encodeURIComponent(
                    'Olkaa hyvä ja täyttäkää oheinen tilausvahvistus niin tilauksenne tallentuu kalenteriimme: https://asbestipro-tilausvahvistus.vercel.app/'
                  )}`}
                  className="block w-full text-center bg-emerald-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  📱 Send Tilausvahvistus SMS
                </a>
              )}
              {(selected.latitude && selected.longitude) ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Open Google Maps
                </a>
              ) : selected.osoite ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selected.osoite + ', ' + selected.kaupunki)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Open Google Maps
                </a>
              ) : null}
              {/* Report button */}
              {(sampleCounts[selected.id] || 0) > 0 && (
                <a
                  href={`/admin/order/${selected.id}/report`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-purple-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-purple-700"
                >
                  📄 Luo raportti
                </a>
              )}
              {/* Delete button */}
              {!showDeleteConfirm && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="block w-full text-center bg-white border border-red-300 text-red-600 py-3 rounded-lg text-sm font-medium hover:bg-red-50"
                >
                  Delete Event
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Survey full-screen view */}
      {showSurvey && selected && (
        <SurveyView
          order={selected}
          onClose={() => {
            setShowSurvey(false);
            // Refresh sample count
            fetch(`/api/orders/${selected.id}/samples`)
              .then(r => r.ok ? r.json() : [])
              .then(data => setSampleCounts(prev => ({ ...prev, [selected.id]: Array.isArray(data) ? data.length : 0 })))
              .catch(() => {});
          }}
        />
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
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-lg font-bold">Quick Note</h2>
                <p className="text-xs text-gray-400">Overwritten when tilausvahvistus arrives</p>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveManualEvent} className="space-y-3">
              {/* District — the main identifier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District / City
                </label>
                <DistrictAutocomplete
                  value={form.kaupunginosa}
                  city={form.kaupunki}
                  onChange={(val) => setForm((prev) => ({ ...prev, kaupunginosa: val }))}
                  onCityChange={(city) => setForm((prev) => ({ ...prev, kaupunki: city }))}
                  placeholder="e.g. Vihti, Töölö, Espoo..."
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time *
                  </label>
                  <select
                    value={form.time}
                    onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone — the key contact info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={form.puhelin}
                  onChange={(e) => setForm((prev) => ({ ...prev, puhelin: e.target.value }))}
                  required
                  placeholder="040 123 4567"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Expandable: more details */}
              <details className="group">
                <summary className="text-xs text-blue-600 cursor-pointer hover:underline select-none">
                  + More details (name, address, price...)
                </summary>
                <div className="mt-3 space-y-3 pt-3 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={form.nimi}
                      onChange={(e) => setForm((prev) => ({ ...prev, nimi: e.target.value }))}
                      className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <AddressAutocomplete
                      value={form.osoite}
                      onChange={(val) => setForm((prev) => ({ ...prev, osoite: val }))}
                      onSelect={(place) => {
                        setForm((prev) => ({
                          ...prev,
                          osoite: place.osoite,
                          postinumero: place.postinumero,
                          kaupunki: place.kaupunki || prev.kaupunki,
                          latitude: place.latitude,
                          longitude: place.longitude,
                        }));
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price (€)
                      </label>
                      <input
                        type="number"
                        value={form.hinta}
                        onChange={(e) => setForm((prev) => ({ ...prev, hinta: e.target.value }))}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. sample taken from bathroom"
                    />
                  </div>
                </div>
              </details>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
