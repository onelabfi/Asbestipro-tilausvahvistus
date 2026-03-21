import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// PATCH /api/orders/[id]/samples/[sampleId] — update a sample
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; sampleId: string } }
) {
  const body = await req.json();
  const allowedFields = ['location', 'notes', 'photos', 'asbestos_detected', 'asbestos_type', 'lab_notes', 'area_m2', 'polyavyys'];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from('samples')
    .update(updates)
    .eq('id', params.sampleId)
    .eq('order_id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE /api/orders/[id]/samples/[sampleId] — delete sample + photos
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; sampleId: string } }
) {
  // First get the sample to find photo paths
  const { data: sample } = await getSupabase()
    .from('samples')
    .select('photos')
    .eq('id', params.sampleId)
    .eq('order_id', params.id)
    .single();

  // Delete photos from storage
  if (sample?.photos?.length) {
    const paths = sample.photos
      .map((url: string) => {
        // Extract path from signed URL: everything after /sample-photos/
        const match = url.match(/sample-photos\/(.+?)(\?|$)/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    if (paths.length) {
      await getSupabase().storage.from('sample-photos').remove(paths);
    }
  }

  // Delete the sample row
  const { error } = await getSupabase()
    .from('samples')
    .delete()
    .eq('id', params.sampleId)
    .eq('order_id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
