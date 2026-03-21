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

  // Kohde settings
  const [kohdeTyyppi, setKohdeTyyppi] = useState<string | null>(order.kohde_tyyppi || null);
  const [kattoMateriaali, setKattoMateriaali] = useState<string | null>(order.katto_materiaali || null);
  const [runkoMateriaali, setRunkoMateriaali] = useState<string | null>(order.runko_materiaali || null);

  const saveKohdeSettings = async (updates: Record<string, string | null>) => {
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch {
      console.error('Failed to save kohde settings');
    }
  };

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

  const handleAddSample = async (data: { location: string; notes: string; area_m2: number | null }): Promise<string> => {
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

  const handleEditSample = async (data: { location: string; notes: string; area_m2: number | null }) => {
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
    polyavyys: number | null;
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
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Kohde settings */}
        <div className="bg-blue-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-blue-800">Kohteen tiedot</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const v = kohdeTyyppi === 'pintaremontti' ? null : 'pintaremontti';
                setKohdeTyyppi(v);
                saveKohdeSettings({ kohde_tyyppi: v, katto_materiaali: null, runko_materiaali: null });
                setKattoMateriaali(null);
                setRunkoMateriaali(null);
              }}
              className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors ${
                kohdeTyyppi === 'pintaremontti' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              Pintaremontti
            </button>
            <button
              type="button"
              onClick={() => {
                const v = kohdeTyyppi === 'purettava' ? null : 'purettava';
                setKohdeTyyppi(v);
                saveKohdeSettings({ kohde_tyyppi: v });
              }}
              className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors ${
                kohdeTyyppi === 'purettava' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              Purettava kohde
            </button>
          </div>
          {kohdeTyyppi === 'purettava' && (
            <>
              <div>
                <p className="text-xs text-blue-700 mb-1">Katto</p>
                <div className="flex gap-1.5">
                  {['pelti', 'huopa', 'tiili'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        const val = kattoMateriaali === v ? null : v;
                        setKattoMateriaali(val);
                        saveKohdeSettings({ katto_materiaali: val });
                      }}
                      className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors capitalize ${
                        kattoMateriaali === v ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-blue-700 mb-1">Runko</p>
                <div className="flex gap-1.5">
                  {['puu', 'tiili', 'betoni'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        const val = runkoMateriaali === v ? null : v;
                        setRunkoMateriaali(val);
                        saveKohdeSettings({ runko_materiaali: val });
                      }}
                      className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors capitalize ${
                        runkoMateriaali === v ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

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

      {/* Sticky bottom buttons */}
      {!showForm && !editingSample && !labSample && (
        <div className="sticky bottom-0 bg-white border-t px-4 py-3 flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            + Lisää näyte
          </button>
          {samples.length > 0 && (
            <button
              onClick={onClose}
              className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-colors"
            >
              Valmis
            </button>
          )}
        </div>
      )}
    </div>
  );
}
