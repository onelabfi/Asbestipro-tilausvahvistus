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
  onSave: (data: { location: string; notes: string }) => Promise<void>;
  onCancel: () => void;
}

export function SampleForm({ orderId, editingSample, onSave, onCancel }: SampleFormProps) {
  const [location, setLocation] = useState(editingSample?.location || '');
  const [notes, setNotes] = useState(editingSample?.notes || '');
  const [photos, setPhotos] = useState<string[]>(editingSample?.photos || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const sampleId = editingSample?.id;
    if (!sampleId) {
      // Will upload after save for new samples
      setError('Tallenna näyte ensin, sitten voit lisätä kuvia.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        const url = await uploadSamplePhoto(orderId, sampleId, file);
        setPhotos((prev) => [...prev, url]);
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
    setSaving(true);
    setError('');
    try {
      await onSave({ location: location.trim(), notes: notes.trim() });
    } catch {
      setError('Tallentaminen epäonnistui.');
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">
        {editingSample ? 'Muokkaa näytettä' : 'Uusi näyte'}
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

      {/* Photos (only for editing existing samples) */}
      {editingSample && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kuvat</label>

          {/* Existing photos */}
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
              {photos.map((url, i) => (
                <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border">
                  <img src={url} alt={`Kuva ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Camera button */}
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
            disabled={uploading}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {uploading ? 'Ladataan...' : '📷 Ota kuva / Valitse tiedosto'}
          </button>
        </div>
      )}

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

      {!editingSample && (
        <p className="text-xs text-gray-400">Kuvia voi lisätä tallentamisen jälkeen.</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          {saving ? 'Tallennetaan...' : 'Tallenna'}
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
