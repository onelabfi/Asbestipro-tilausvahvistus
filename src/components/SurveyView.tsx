'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Sample, Order } from '@/lib/supabase';
import { SampleCard } from './SampleCard';
import { SampleForm } from './SampleForm';
import { LabResultsForm } from './LabResultsForm';

interface SurveyViewProps {
  order: Order;
  onClose: () => void;
}

export function SurveyView({ order, onClose }: SurveyViewProps) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSample, setEditingSample] = useState<Sample | null>(null);
  const [labSample, setLabSample] = useState<Sample | null>(null);

  const fetchSamples = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${order.id}/samples`);
      if (res.ok) {
        const data = await res.json();
        setSamples(data);
      }
    } catch {
      console.error('Failed to fetch samples');
    } finally {
      setLoading(false);
    }
  }, [order.id]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  const handleAddSample = async (data: { location: string; notes: string }): Promise<string> => {
    const res = await fetch(`/api/orders/${order.id}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error('Failed to create sample');
    }
    const created = await res.json();
    await fetchSamples();
    // Don't close form here — let the form decide (it may want to add photos)
    return created.id;
  };

  const handleEditSample = async (data: { location: string; notes: string }) => {
    if (!editingSample) return;
    const res = await fetch(`/api/orders/${order.id}/samples/${editingSample.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error('Failed to update sample');
    }
    await fetchSamples();
    setEditingSample(null);
  };

  const handlePhotoAdded = (sampleId: string, url: string) => {
    setSamples((prev) =>
      prev.map((s) =>
        s.id === sampleId ? { ...s, photos: [...s.photos, url] } : s
      )
    );
  };

  const handleDeleteSample = async (sampleId: string) => {
    const res = await fetch(`/api/orders/${order.id}/samples/${sampleId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setSamples((prev) => prev.filter((s) => s.id !== sampleId));
    }
  };

  const handleLabResults = async (data: {
    asbestos_detected: boolean | null;
    asbestos_type: string | null;
    lab_notes: string | null;
  }) => {
    if (!labSample) return;
    const res = await fetch(`/api/orders/${order.id}/samples/${labSample.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error('Failed to save lab results');
    }
    await fetchSamples();
    setLabSample(null);
  };

  const resultsCount = samples.filter((s) => s.asbestos_detected !== null).length;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 -ml-2"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Kartoitus</h1>
          <p className="text-xs text-gray-500 truncate">
            {order.kaupunginosa || order.osoite} — {samples.length} näytettä
            {resultsCount > 0 && ` (${resultsCount} tulosta)`}
          </p>
        </div>
        {samples.length > 0 && (
          <a
            href={`/admin/order/${order.id}/report`}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
          >
            Raportti
          </a>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Ladataan...</div>
        ) : samples.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 mb-1">Ei näytteitä vielä</p>
            <p className="text-sm text-gray-400">Lisää ensimmäinen näyte aloittaaksesi kartoituksen.</p>
          </div>
        ) : (
          <>
            {samples.map((sample, index) => (
              <SampleCard
                key={sample.id}
                sample={sample}
                index={index}
                orderId={order.id}
                onEdit={(s) => { setEditingSample(s); setShowForm(false); setLabSample(null); }}
                onDelete={handleDeleteSample}
                onLabResults={(s) => { setLabSample(s); setShowForm(false); setEditingSample(null); }}
                onPhotoAdded={handlePhotoAdded}
              />
            ))}
          </>
        )}

        {/* Lab results form */}
        {labSample && (
          <LabResultsForm
            sample={labSample}
            onSave={handleLabResults}
            onCancel={() => setLabSample(null)}
          />
        )}

        {/* Edit form */}
        {editingSample && (
          <SampleForm
            orderId={order.id}
            editingSample={editingSample}
            onSave={handleEditSample}
            onCancel={() => { setEditingSample(null); fetchSamples(); }}
            onPhotoAdded={handlePhotoAdded}
          />
        )}

        {/* Add form */}
        {showForm && (
          <SampleForm
            orderId={order.id}
            onSave={handleAddSample}
            onCancel={() => { setShowForm(false); fetchSamples(); }}
            onPhotoAdded={handlePhotoAdded}
          />
        )}
      </div>

      {/* Sticky bottom button */}
      {!showForm && !editingSample && !labSample && (
        <div className="sticky bottom-0 bg-white border-t px-4 py-3">
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            + Lisää näyte
          </button>
        </div>
      )}
    </div>
  );
}
