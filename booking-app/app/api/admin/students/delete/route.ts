import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

interface StudentProfile {
  id: string;
  name: string;
  birthday: string;
  parentPhone: string;
}

export async function POST(request: Request) {
  try {
    const adminToken = request.headers.get('x-admin-token');
    if (adminToken !== 'admin_token_validated') {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
    }

    const db = getDB();
    const profile = (await db.get(`student:${id}`)) as StudentProfile | null;
    if (!profile) {
      return NextResponse.json({ success: false, error: 'student_not_found' }, { status: 404 });
    }

    const bookingsCount = await db.scard(`student_bookings:${id}`);
    if (bookingsCount > 0) {
      return NextResponse.json({ success: false, error: 'has_bookings' }, { status: 400 });
    }

    // Clear profile
    await db.del(`student:${id}`);
    // Clear lookup key
    await db.del(`student_lookup:${profile.name}:${profile.birthday}`);

    // Remove from registered_students if no other student has the same name
    const allKeys = await db.keys('student:*');
    const studentKeys = allKeys.filter(
      (key) => key.startsWith('student:') && !key.startsWith('student_lookup:') && !key.startsWith('student_bookings:')
    );
    let nameCount = 0;
    for (const k of studentKeys) {
      const p = (await db.get(k)) as StudentProfile | null;
      if (p && p.name === profile.name) {
        nameCount++;
      }
    }
    if (nameCount === 0) {
      await db.srem('registered_students', profile.name);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
