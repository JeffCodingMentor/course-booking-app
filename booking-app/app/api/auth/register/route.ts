import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { name, birthday, parentPhone } = await request.json();
    if (!name || !birthday || !parentPhone) {
      return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
    }
    const db = getDB();
    const userKey = `student:${name}:${birthday}`;
    const user = { name, birthday, parentPhone, registeredAt: new Date().toISOString() };
    
    await db.set(userKey, user);
    await db.sadd('registered_students', name);

    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
