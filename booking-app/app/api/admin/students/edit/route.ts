import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

interface StudentProfile {
  id: string;
  name: string;
  birthday: string;
  parentPhone: string;
  registeredAt?: string;
}

export async function POST(request: Request) {
  try {
    const adminToken = request.headers.get('x-admin-token');
    if (adminToken !== 'admin_token_validated') {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const { id, name, birthday, parentPhone } = await request.json();
    if (!id || !name || !birthday || !parentPhone) {
      return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
    }

    const db = getDB();
    const oldProfile = (await db.get(`student:${id}`)) as StudentProfile | null;
    if (!oldProfile) {
      return NextResponse.json({ success: false, error: 'student_not_found' }, { status: 404 });
    }

    // Check collision for name + birthday if changed
    if (oldProfile.name !== name || oldProfile.birthday !== birthday) {
      const newLookupKey = `student_lookup:${name}:${birthday}`;
      const targetStudentId = await db.get(newLookupKey);
      if (targetStudentId && targetStudentId !== id) {
        return NextResponse.json({ success: false, error: 'name_birthday_collision' }, { status: 400 });
      }

      // Delete old lookup key
      await db.del(`student_lookup:${oldProfile.name}:${oldProfile.birthday}`);
      // Write new lookup key
      await db.set(newLookupKey, id);
    }

    // Sync registered_students cache
    if (oldProfile.name !== name) {
      const allKeys = await db.keys('student:*');
      const studentKeys = allKeys.filter(
        (key) => key.startsWith('student:') && !key.startsWith('student_lookup:') && !key.startsWith('student_bookings:')
      );
      let oldNameCount = 0;
      for (const k of studentKeys) {
        if (k === `student:${id}`) continue;
        const p = (await db.get(k)) as StudentProfile | null;
        if (p && p.name === oldProfile.name) {
          oldNameCount++;
        }
      }
      if (oldNameCount === 0) {
        await db.srem('registered_students', oldProfile.name);
      }
      await db.sadd('registered_students', name);
    }

    const updatedProfile = {
      ...oldProfile,
      name,
      birthday,
      parentPhone,
    };
    await db.set(`student:${id}`, updatedProfile);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
