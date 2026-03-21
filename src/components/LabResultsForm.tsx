'use client';

import { useState } from 'react';
import type { Sample } from '@/lib/supabase';

const ASBESTOS_TYPES = [
  'Krysotiili',
  'Amosiitti',
  'Krokidoliitti',
  'Antofylliitti',
  'Tremoliitti',
  'Aktinoliitti',
];

interface LabResultsFormProps {
  sample: Sample;
  onSave: (data: {
    asbestos_detected: boolean | null;
    asbestos_type: string | null;
    lab_notes: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

export function LabResultsForm({ sample, onSave, onCancel }: LabResultsFormProps) {
  const [detected, setDetected] = useState<boolean | null>(sample.asbestos_detected);
  const [type, setType] = useState(sample.asbestos_type || '');
  const [labNotes, setLabNotes] = useState(sample.lab_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        asbestos_detected: detected,
        asbestos_type: detected === true ? type || null : null,
        lab_notes: labNotes.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">
        Laboratoriotulokset — {sample.location}
      </h3>

      {/* Detection toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Asbestia havaittu?</label>
        <div className="flex rounded-lg border overflow-hidden">
          <button
            type="button"
            onClick={() => setDetected(null)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              detected === null ? 'bg-gray-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Odottaa
          </button>
          <button
            type="button"
            onClick={() => setDetected(false)}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-l ${
              detected === false ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Ei
          </button>
          <button
            type="button"
            onClick={() => setDetected(true)}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-l ${
              detected === true ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Kyllä
          </button>
        </div>
      </div>

      {/* Asbestos type (only when detected) */}
      {detected === true && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asbestityyppi</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Valitse tyyppi...</option>
            {ASBESTOS_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {/* Lab notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Laboratoriomuistiinpanot</label>
        <textarea
          value={labNotes}
          onChange={(e) => setLabNotes(e.target.value)}
          placeholder="Vapaaehtoinen..."
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          {saving ? 'Tallennetaan...' : 'Tallenna tulokset'}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
        >
          Peruuta
        </button>
      </div>
    </div>
  );
}
