'use client';
import { adminFetch } from '@/lib/admin-fetch';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { Order } from '@/lib/supabase';
import Link from 'next/link';

const MARKER_COLORS: Record<string, string> = {
  paid: '#22c55e',
  pending: '#eab308',
  failed: '#ef4444',
};

export default function MapPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCity, setFilterCity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showRoute, setShowRoute] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const fetchOrders = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterDate) params.set('date', filterDate);
    if (filterCity) params.set('city', filterCity);
    if (filterStatus) params.set('status', filterStatus);

    const res = await adminFetch(`/api/orders?${params}`);
    const data = await res.json();
    if (Array.isArray(data)) setOrders(data);
  }, [filterDate, filterCity, filterStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Initialize map
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current || mapInstance.current) return;

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'marker'],
    });

    loader.importLibrary('maps').then(async () => {
      await google.maps.importLibrary('marker');
      if (!mapRef.current) return;
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: { lat: 60.17, lng: 24.94 },
        zoom: 11,
        mapId: 'asbestipro-map',
      });
      infoWindowRef.current = new google.maps.InfoWindow();
    }).catch((err) => {
      console.error('Google Maps load error:', err);
    });
  }, []);

  // Update markers when orders change
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    // Clear route
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }

    if (orders.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    orders.forEach((order) => {
      if (!order.latitude || !order.longitude) return;

      const pos = { lat: order.latitude, lng: order.longitude };
      bounds.extend(pos);

      const color = MARKER_COLORS[order.payment_status] || MARKER_COLORS.pending;

      const pinEl = document.createElement('div');
      pinEl.style.width = '24px';
      pinEl.style.height = '24px';
      pinEl.style.borderRadius = '50%';
      pinEl.style.backgroundColor = color;
      pinEl.style.border = '3px solid white';
      pinEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstance.current!,
        position: pos,
        title: order.kaupunginosa,
        content: pinEl,
      });

      marker.addListener('click', () => {
        const aikaDate = new Date(order.aika);
        const aikaStr = aikaDate.toLocaleDateString('fi-FI', {
          day: 'numeric',
          month: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        infoWindowRef.current?.setContent(`
          <div style="font-family: sans-serif; min-width: 200px; padding: 4px;">
            <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">${order.kaupunginosa}</h3>
            <p style="margin: 2px 0; font-size: 13px; color: #555;">${order.osoite}</p>
            <p style="margin: 2px 0; font-size: 13px; color: #555;">${aikaStr}</p>
            <p style="margin: 2px 0; font-size: 13px;"><strong>${order.nimi}</strong></p>
            <p style="margin: 2px 0; font-size: 13px; color: #555;">${order.puhelin}</p>
            <p style="margin: 2px 0; font-size: 13px; color: #555;">Remontti: ${order.remontti || '-'}</p>
            <p style="margin: 8px 0 4px; font-size: 15px; font-weight: 700;">${order.hinta} €</p>
            <div style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}"
                 target="_blank" rel="noopener"
                 style="background: #2563eb; color: white; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500;">
                Navigoi
              </a>
              <a href="tel:${order.puhelin}"
                 style="background: #1f2937; color: white; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500;">
                Soita
              </a>
              <a href="/admin/order/${order.id}"
                 style="background: #f3f4f6; color: #374151; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500;">
                Tilaus
              </a>
            </div>
          </div>
        `);
        infoWindowRef.current?.open(mapInstance.current!, marker);
      });

      markersRef.current.push(marker);
    });

    if (orders.length > 0) {
      mapInstance.current.fitBounds(bounds, 60);
    }
  }, [orders]);

  // Draw route
  useEffect(() => {
    if (!showRoute || !mapInstance.current || orders.length < 2) return;

    const sorted = [...orders].sort(
      (a, b) => new Date(a.aika).getTime() - new Date(b.aika).getTime()
    );

    const validSorted = sorted.filter((o) => o.latitude && o.longitude);
    if (validSorted.length < 2) return;

    const waypoints = validSorted.slice(1, -1).map((o) => ({
      location: { lat: o.latitude!, lng: o.longitude! },
      stopover: true,
    }));

    const directionsService = new google.maps.DirectionsService();
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map: mapInstance.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#2563eb',
        strokeWeight: 4,
        strokeOpacity: 0.7,
      },
    });

    directionsService.route(
      {
        origin: { lat: validSorted[0].latitude!, lng: validSorted[0].longitude! },
        destination: {
          lat: validSorted[validSorted.length - 1].latitude!,
          lng: validSorted[validSorted.length - 1].longitude!,
        },
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          directionsRendererRef.current?.setDirections(result);
        }
      }
    );
  }, [showRoute, orders]);

  const cities = [...new Set(orders.map((o) => o.kaupunki))].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-bold">Kartta</h1>
      </div>

      {/* Filters */}
      <div className="bg-white border-b px-4 py-3 flex flex-wrap gap-3 items-center">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => {
            setFilterDate(e.target.value);
            setShowRoute(false);
          }}
          className="px-3 py-2 border rounded-lg text-sm"
        />
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Kaikki kaupungit</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Kaikki statukset</option>
          <option value="paid">Maksettu</option>
          <option value="pending">Odottaa</option>
          <option value="failed">Epäonnistunut</option>
        </select>
        <button
          onClick={() => setShowRoute(!showRoute)}
          disabled={orders.length < 2}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            showRoute
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          {showRoute ? 'Piilota reitti' : 'Suunnittele päivän reitti'}
        </button>
        <span className="text-sm text-gray-500 ml-auto">
          {orders.length} tilausta
        </span>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1 min-h-[calc(100vh-120px)]" />
    </div>
  );
}
