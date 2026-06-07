import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  // Only allow in non-production environments to avoid data leakage
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDB();
  interface Dumpable {
    dump(): unknown;
  }
  if ('dump' in db && typeof (db as unknown as Dumpable).dump === 'function') {
    return NextResponse.json((db as unknown as Dumpable).dump());
  }

  return NextResponse.json({ message: 'Running on external KV, dump not supported locally' });
}
