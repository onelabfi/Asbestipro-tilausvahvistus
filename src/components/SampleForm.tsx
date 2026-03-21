'use client';

import { useState, useRef } from 'react';
import type { Sample } from '@/lib/supabase';
import { uploadSamplePhoto } from '@/lib/photoUtils';

const SIJAINTI_OPTIONS = [
  'Keittiö',
  'KPH',
  'WC',
  'MH',
  'OH',
  'Eteinen',
  'Kellari',
  'Ullakko',
  'Katto',
  'Sauna',
  'Julkisivu',
  'Porraskäytävä',
];

const KOHTA_OPTIONS = [
  { value: 'S', label: 'Seinä' },
  { value: 'L', label: 'Lattia' },
];

const MATERIAALI_OPTIONS = [
  'Matto',
  'Liima',
  'Laatta',
  'Laasti',
  'Levy',
  'Eriste',
  'Putkieriste',
  'Tasoite',
];

// Parse existing location string back into parts for editing
function parseLocation(location: string): { sijainti: string; kohta: string; materiaalit: string[] } {
  if (!location) return { sijainti: '', kohta: '', materiaalit: [] };

  const parts = location.split(' ');
  let sijainti = '';
  let kohta = '';
  const materiaalit: string[] = [];

  // First token is sijainti
  if (parts.length > 0) {
    const first = parts[0];
    if (SIJAINTI_OPTIONS.includes(first)) {
      sijainti = first;
    } else {
      // Free text — put everything back
      return { sijainti: location, kohta: '', materiaalit: [] };
    }
  }

  // Second token might be S or L
  if (parts.length > 1) {
    const second = parts[1];
    if (second === 'S' || second === 'L') {
      kohta = second;
      // Rest is materials (comma-separated after join)
      const rest = parts.slice(2).join(' ');
      if (rest) {
        materiaalit.push(...rest.split(',').map(m => m.trim()).filter(Boolean));
      }
    } else {
      // No kohta, rest is materials
      const rest = parts.slice(1).join(' ');
      if (rest) {
        materiaalit.push(...rest.split(',').map(m => m.trim()).filter(Boolean));
      }
    }
  }

  return { sijainti, kohta, materiaalit };
}

function buildLocation(sijainti: string, kohta: string, materiaalit: string[]): string {
  const parts = [sijainti];
  if (kohta) parts.push(kohta);
  if (materiaalit.length > 0) parts.push(materiaalit.join(', '));
  return parts.filter(Boolean).join(' ');
}

interface SampleFormProps {
  orderId: string;
  editingSample?: Sample | null;
  onSave: (data: { location: string; notes: string }) => Promise<string | void>;
  onCancel: () => void;
  onPhotoAdded?: (sampleId: string, url: string) => void;
}

export function SampleForm({ orderId, editingSample, onSave, onCancel, onPhotoAdded }: SampleFormProps) {
  const parsed = parseLocation(editingSample?.location || '');
  const [sijainti, setSijainti] = useState(parsed.sijainti);
  const [kohta, setKohta] = useState(parsed.kohta);
  const [materiaalit, setMateriaalit] = useState<string[]>(parsed.materiaalit);
  const [notes, setNotes] = useState(editingSample?.notes || '');
  const [photos, setPhotos] = useState<string[]>(editingSample?.photos || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedSampleId, setSavedSampleId] = useState<string | null>(editingSample?.id || null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleMateriaali = (mat: string) => {
    setMateriaalit((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat]
    );
  };

  const getLocation = () => buildLocation(sijainti, kohta, materiaalit);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    let sampleId = savedSampleId;
    const location = getLocation();

    if (!sampleId) {
      if (!location.trim()) {
        setError('Valitse sijainti ensin.');
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
      setSaving(true);
      setError('');
      try {
        const result = await onSave({ location, notes: notes.trim() });
        if (typeof result === 'string') {
          sampleId = result;
          setSavedSampleId(result);
        } else {
          setError('Näytteen tallennus epäonnistui.');
          if (fileRef.current) fileRef.current.value = '';
          setSaving(false);
          return;
        }
      } catch {
        setError('Näytteen tallennus epäonnistui.');
        if (fileRef.current) fileRef.current.value = '';
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        const url = await uploadSamplePhoto(orderId, sampleId, file);
        setPhotos((prev) => [...prev, url]);
        onPhotoAdded?.(sampleId, url);
      }
    } catch {
      setError('Kuvan lataus epäonnistui.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    const location = getLocation();
    if (!location.trim()) {
      setError('Valitse sijainti.');
      return;
    }

    if (savedSampleId && !editingSample) {
      try {
        await fetch(`/api/orders/${orderId}/samples/${savedSampleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location, notes: notes.trim() }),
        });
      } catch {
        // Non-critical
      }
      onCancel();
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({ location, notes: notes.trim() });
    } catch {
      setError('Tallentaminen epäonnistui.');
    } finally {
      setSaving(false);
    }
  };

  const selectClass = (selected: boolean) =>
    `text-xs px-3 py-2 rounded-lg border transition-colors font-medium ${
      selected
        ? 'bg-blue-600 border-blue-600 text-white'
        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
    }`;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">
        {editingSample ? 'Muokkaa näytettä' : savedSampleId ? 'Näyte tallennettu — lisää kuvia' : 'Uusi näyte'}
      </h3>

      {/* Row 1: Sijainti, Kohta, Materiaali */}
      <div className="space-y-3">
        {/* Sijainti */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Sijainti *</label>
          <div className="flex flex-wrap gap-1.5">
            {SIJAINTI_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSijainti(opt)}
                className={selectClass(sijainti === opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Kohta */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Kohta</label>
          <div className="flex gap-2">
            {KOHTA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKohta(kohta === opt.value ? '' : opt.value)}
                className={`${selectClass(kohta === opt.value)} flex-1 py-2.5`}
              >
                {opt.value} — {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Materiaali (multi-select) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Materiaali {materiaalit.length > 0 && <span className="text-blue-600">({materiaalit.length})</span>}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {MATERIAALI_OPTIONS.map((mat) => (
              <button
                key={mat}
                type="button"
                onClick={() => toggleMateriaali(mat)}
                className={selectClass(materiaalit.includes(mat))}
              >
                {materiaalit.includes(mat) && '✓ '}{mat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview of composed location */}
      {getLocation() && (
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium">
          📍 {getLocation()}
        </div>
      )}

      {/* Camera button */}
      <div>
        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {photos.map((url, i) => (
              <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border">
                <img src={url} alt={`Kuva ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
          multiple
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || saving}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {uploading ? 'Ladataan...' : saving ? 'Tallennetaan...' : '📷 Ota kuva'}
        </button>
        {!savedSampleId && !editingSample && (
          <p className="text-xs text-gray-400 mt-1">Näyte tallennetaan automaattisesti kun otat kuvan.</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Muistiinpanot</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Vapaaehtoinen kuvaus..."
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          {saving ? 'Tallennetaan...' : savedSampleId && !editingSample ? 'Valmis' : 'Tallenna'}
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
