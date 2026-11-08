import { NextRequest, NextResponse } from 'next/server';
import { readMediaObject } from '@/lib/supabase-admin';
export const runtime = 'nodejs';
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (parts.length < 2 || parts.some(p => !p || p === '.' || p === '..' || p.includes('\\') || p.includes('/')))
    return new NextResponse('Not found', { status: 404 });
  try {
    const media = await readMediaObject(parts[0], parts.slice(1).join('/'));
    if (!media) return new NextResponse('Not found', { status: 404 });
    return new NextResponse(new Uint8Array(media.body), { headers: {
      'Content-Type': media.content_type, 'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    console.error('Media lookup failed', error);
    return new NextResponse('Temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
