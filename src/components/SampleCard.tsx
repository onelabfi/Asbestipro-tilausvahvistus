'use client';

import { useState, useRef } from 'react';
import type { Sample } from '@/lib/supabase';
import { uploadSamplePhoto } from '@/lib/photoUtils';

interface SampleCardProps {
  sample: Sample;
  index: number;
  orderId: string;
  isAdmin?: boolean;
  onEdit: (sample: Sample) => void;
  onDelete: (sampleId: string) => void;
  onLabResults: (sample: Sample) => void;
  onPhotoAdded: (sampleId: string, url: string) => void;
}

export function SampleCard({ sample, index, orderId, isAdmin = false, onEdit, onDelete, onLabResults, onPhotoAdded }: SampleCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadSamplePhoto(orderId, sample.id, file);
        onPhotoAdded(sample.id, url);
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const labBadge = () => {
    if (sample.asbestos_detected === true) {
      return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Asbesti havaittu</span>;
    }
    if (sample.asbestos_detected === false) {
      return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Ei asbestia</span>;
    }
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Odottaa tuloksia</span>;
  };

  return (
    <>
      <div className="bg-white rounded-xl border shadow-sm p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-xs text-gray-400 font-medium">Näyte {index + 1}</span>
            <h3 className="font-semibold text-gray-900">{sample.location}</h3>
          </div>
          {labBadge()}
        </div>

        {/* Photos */}
        {sample.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
            {sample.photos.map((url, i) => (
              <button
                key={i}
                onClick={() => setViewPhoto(url)}
                className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border"
              >
                <img src={url} alt={`Kuva ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Quick camera button */}
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
          className="w-full py-2.5 mb-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {uploading ? 'Ladataan...' : `📷 ${sample.photos.length === 0 ? 'Ota kuva' : 'Lisää kuva'}`}
        </button>

        {/* Notes */}
        {sample.notes && (
          <p className="text-sm text-gray-600 mb-2">{sample.notes}</p>
        )}

        {/* Lab info */}
        {sample.asbestos_detected === true && sample.asbestos_type && (
          <p className="text-xs text-red-600 mb-2">Tyyppi: {sample.asbestos_type}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {isAdmin && (
            <button
              onClick={() => onLabResults(sample)}
              className="flex-1 text-xs py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium"
            >
              Tulokset
            </button>
          )}
          <button
            onClick={() => onEdit(sample)}
            className="flex-1 text-xs py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium"
          >
            Muokkaa
          </button>
          {confirmDelete ? (
            <button
              onClick={() => { onDelete(sample.id); setConfirmDelete(false); }}
              className="flex-1 text-xs py-1.5 rounded-lg bg-red-500 text-white font-medium"
            >
              Vahvista
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex-1 text-xs py-1.5 rounded-lg bg-gray-50 text-red-500 hover:bg-red-50 font-medium"
            >
              Poista
            </button>
          )}
        </div>
      </div>

      {/* Full-screen photo viewer */}
      {viewPhoto && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl font-light"
            onClick={() => setViewPhoto(null)}
          >
            &times;
          </button>
          <img src={viewPhoto} alt="Näyte" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}
