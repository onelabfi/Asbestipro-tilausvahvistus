'use client';

import { useState, useRef } from 'react';
import type { Sample } from '@/lib/supabase';
import { uploadSamplePhoto } from '@/lib/photoUtils';

const LOCATION_PRESETS = [
  'Kylpyhuone seinä',
  'Kylpyhuone lattia',
  'Keittiö seinä',
  'Keittiö lattia',
  'Makuuhuone',
  'Olohuone',
  'Eteinen',
  'WC',
  'Kellari',
  'Ullakko',
  'Porraskäytävä',
  'Julkisivu',
];

interface SampleFormProps {
  orderId: string;
  editingSample?: Sample | null;
  onSave: (data: { location: string; notes: string }) => Promise<string | void>;
  onCancel: () => void;
  onPhotoAdded?: (sampleId: string, url: string) => void;
}

export function SampleForm({ orderId, editingSample, onSave, onCancel, onPhotoAdded }: SampleFormProps) {
  const [location, setLocation] = useState(editingSample?.location || '');
  const [notes, setNotes] = useState(editingSample?.notes || '');
  const [photos, setPhotos] = useState<string[]>(editingSample?.photos || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Track sampleId for new samples after auto-save
  const [savedSampleId, setSavedSampleId] = useState<string | null>(editingSample?.id || null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    let sampleId = savedSampleId;

    // Auto-save the sample first if it hasn't been saved yet
    if (!sampleId) {
      if (!location.trim()) {
        setError('Valitse sijainti ensin.');
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
      setSaving(true);
      setError('');
      try {
        const result = await onSave({ location: location.trim(), notes: notes.trim() });
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
    if (!location.trim()) {
      setError('Sijainti on pakollinen.');
      return;
    }

    // If already auto-saved (photo was taken first), just close
    if (savedSampleId && !editingSample) {
      // Update with latest notes if changed
      try {
        await fetch(`/api/orders/${orderId}/samples/${savedSampleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location: location.trim(), notes: notes.trim() }),
        });
      } catch {
        // Non-critical — sample already saved
      }
      onCancel();
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({ location: location.trim(), notes: notes.trim() });
    } catch {
      setError('Tallentaminen epäonnistui.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">
        {editingSample ? 'Muokkaa näytettä' : savedSampleId ? 'Näyte tallennettu — lisää kuvia' : 'Uusi näyte'}
      </h3>

      {/* Location input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sijainti *</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="esim. Kylpyhuone seinä"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        {/* Quick-select chips */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {LOCATION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setLocation(preset)}
              className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                location === preset
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Camera button — always visible */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kuvat</label>

        {/* Photo previews */}
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Muistiinpanot</label>
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
