import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    if (!name) {
      return NextResponse.json({ valid: false, error: 'missing_name' }, { status: 400 });
    }
    const db = getDB();
    const isMember = await db.sismember('registered_students', name);
    return NextResponse.json({ valid: isMember === 1 });
  } catch {
    return NextResponse.json({ valid: false, error: 'server_error' }, { status: 500 });
  }
}
