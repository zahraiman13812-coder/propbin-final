import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { withDatabaseTransaction } from '@/lib/supabase-admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  try {
    if (!(await isAdmin())) return new NextResponse(null, { status: 401, headers });
    const { id, index } = await params;
    if (!/^[a-f0-9-]{36}$/i.test(id) || !/^[0-4]$/.test(index)) return new NextResponse(null, { status: 404, headers });
    const image = await withDatabaseTransaction(async client => {
      const result = await client.query('SELECT images ->> $2::int AS image FROM public.article_lottery_submissions WHERE id=$1', [id, Number(index)]);
      return result.rows[0]?.image;
    });
    const match = typeof image === 'string' && image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return new NextResponse(null, { status: 404, headers });
    return new NextResponse(new Uint8Array(Buffer.from(match[2], 'base64')), { headers: { ...headers, 'Content-Type': match[1] } });
  } catch (error) {
    console.error('Private image lookup failed', error);
    return new NextResponse(null, { status: 503, headers });
  }
}
