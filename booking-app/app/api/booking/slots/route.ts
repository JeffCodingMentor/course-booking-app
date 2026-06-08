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
    const capacityVal = await db.get(`capacity:${date}`);
    const defaultCapacity = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'].includes(date) ? 0 : 2;
    const capacity = typeof capacityVal === 'number' ? capacityVal : defaultCapacity;
    return NextResponse.json({ slots, capacity });
  } catch {
    return NextResponse.json({ slots: [], capacity: 2 });
  }
}
