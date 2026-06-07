import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) {
      return NextResponse.json({ slots: [] });
    }
    const db = getDB();
    const slots = await db.get(`booking:${date}`) || [];
    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json({ slots: [] });
  }
}
