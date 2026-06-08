import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { name, birthday } = await request.json();
    if (!name || !birthday) {
      return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
    }
    const db = getDB();
    const studentId = await db.get(`student_lookup:${name}:${birthday}`);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'not_registered' });
    }
    const user = await db.get(`student:${studentId}`);
    if (!user) {
      return NextResponse.json({ success: false, error: 'not_registered' });
    }
    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
