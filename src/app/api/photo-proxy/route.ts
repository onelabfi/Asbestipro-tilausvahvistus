import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// Proxy Supabase Storage photos server-side so they work on public report pages
// Usage: /api/photo-proxy?path=orderId/sampleId/filename.jpg
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return new NextResponse('Missing path', { status: 400 });
  }

  try {
    // Generate a fresh signed URL server-side using the service key
    const { data, error } = await getSupabase()
      .storage
      .from('sample-photos')
      .createSignedUrl(path, 60 * 60); // 1 hour is plenty

    if (error || !data?.signedUrl) {
      return new NextResponse('Photo not found', { status: 404 });
    }

    // Fetch the actual image and stream it back
    const imageRes = await fetch(data.signedUrl);
    if (!imageRes.ok) {
      return new NextResponse('Failed to fetch photo', { status: 502 });
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('Photo proxy error:', err);
    return new NextResponse('Server error', { status: 500 });
  }
}
