import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getUserFromRequest } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const orderId = formData.get('orderId') as string | null;
  const sampleId = formData.get('sampleId') as string | null;

  if (!file || !orderId || !sampleId) {
    return NextResponse.json({ error: 'Missing file, orderId, or sampleId.' }, { status: 400 });
  }

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${orderId}/${sampleId}/${crypto.randomUUID()}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await getSupabase()
    .storage
    .from('sample-photos')
    .upload(filename, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }

  // Get signed URL (valid 1 year)
  const { data: urlData } = await getSupabase()
    .storage
    .from('sample-photos')
    .createSignedUrl(filename, 60 * 60 * 24 * 365);

  if (!urlData?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate URL.' }, { status: 500 });
  }

  // Append photo URL to sample's photos array
  const { data: sample } = await getSupabase()
    .from('samples')
    .select('photos')
    .eq('id', sampleId)
    .single();

  const currentPhotos = sample?.photos || [];
  const { error: updateError } = await getSupabase()
    .from('samples')
    .update({ photos: [...currentPhotos, urlData.signedUrl] })
    .eq('id', sampleId);

  if (updateError) {
    console.error('Update error:', updateError);
    return NextResponse.json({ error: 'Failed to save photo reference.' }, { status: 500 });
  }

  return NextResponse.json({ url: urlData.signedUrl });
}
