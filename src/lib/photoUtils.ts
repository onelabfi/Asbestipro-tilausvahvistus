import imageCompression from 'browser-image-compression';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

/**
 * Compress a photo before upload.
 * Targets ~0.5MB max, 1200px max dimension.
 */
export async function compressPhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });
}

/**
 * Compress and upload a photo for a sample.
 * Returns the signed URL of the uploaded photo.
 */
export async function uploadSamplePhoto(
  orderId: string,
  sampleId: string,
  file: File
): Promise<string> {
  const compressed = await compressPhoto(file);

  const formData = new FormData();
  formData.append('file', compressed, compressed.name || 'photo.jpg');
  formData.append('orderId', orderId);
  formData.append('sampleId', sampleId);

  const { data: { session } } = await getSupabaseBrowser().auth.getSession();
  const res = await fetch('/api/upload-sample-photo', {
    method: 'POST',
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Upload failed');
  }

  const data = await res.json();
  return data.url;
}
