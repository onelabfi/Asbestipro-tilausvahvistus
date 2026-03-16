'use client';

import { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { Order } from '@/lib/supabase';
import Link from 'next/link';

export default function CalendarPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);

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
    title: o.kaupunginosa,
    start: o.aika,
    end: new Date(new Date(o.aika).getTime() + 30 * 60 * 1000).toISOString(),
    backgroundColor:
      o.payment_status === 'paid'
        ? '#22c55e'
        : o.payment_status === 'failed'
        ? '#ef4444'
        : '#eab308',
    borderColor: 'transparent',
    extendedProps: o,
  }));

  const smsLink = (order: Order) => {
    const msg = `Hei! Vahvista tilaus täältä: ${process.env.NEXT_PUBLIC_APP_URL || 'https://tilaus.asbesti.pro'}`;
    return `sms:${order.puhelin}?body=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Kalenteri</h1>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth',
          }}
          locale="fi"
          firstDay={1}
          events={events}
          eventClick={(info) => {
            const order = info.event.extendedProps as Order;
            setSelected(order);
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

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold">{selected.kaupunginosa}</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Asiakas</span>
                <p className="font-medium">{selected.nimi}</p>
              </div>
              <div>
                <span className="text-gray-500">Puhelin</span>
                <p className="font-medium">{selected.puhelin}</p>
              </div>
              <div>
                <span className="text-gray-500">Sähköposti</span>
                <p className="font-medium">{selected.email}</p>
              </div>
              <div>
                <span className="text-gray-500">Osoite</span>
                <p className="font-medium">
                  {selected.osoite}, {selected.kaupunginosa}, {selected.kaupunki}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Remontti</span>
                <p className="font-medium">{selected.remontti || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Hinta</span>
                <p className="font-medium">{selected.hinta} €</p>
              </div>
              <div>
                <span className="text-gray-500">Maksu</span>
                <p className="font-medium">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      selected.payment_status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : selected.payment_status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {selected.payment_status === 'paid'
                      ? 'Maksettu'
                      : selected.payment_status === 'failed'
                      ? 'Epäonnistunut'
                      : 'Odottaa'}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Avaa Google Maps
              </a>
              <a
                href={smsLink(selected)}
                className="block w-full text-center bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Lähetä vahvistuslinkki (SMS)
              </a>
              <Link
                href={`/admin/order/${selected.id}`}
                className="block w-full text-center bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Avaa tilaus
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
