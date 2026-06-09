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
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const { parentPhone } = await request.json();
    if (!parentPhone || !parentPhone.trim()) {
      return NextResponse.json({ success: false, error: 'invalid_phone' }, { status: 400 });
    }

    const db = getDB();
    const profile = (await db.get(`student:${userId}`)) as StudentProfile | null;
    if (!profile) {
      return NextResponse.json({ success: false, error: 'student_not_found' }, { status: 404 });
    }

    // Update the phone number
    profile.parentPhone = parentPhone.trim();
    await db.set(`student:${userId}`, profile);

    return NextResponse.json({ success: true, user: profile });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
