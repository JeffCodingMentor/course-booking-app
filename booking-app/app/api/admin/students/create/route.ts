import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // 2. Admin Authentication Guard
    const adminToken = request.headers.get('x-admin-token');
    if (adminToken !== 'admin_token_validated') {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    // 3. Request Body Parsing & Validation
    const { name, birthday, parentPhone } = await request.json();
    if (!name || !birthday || !parentPhone) {
      return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
    }

    // 4. Write to Database using ID-centric format
    const db = getDB();
    const lookupKey = `student_lookup:${name}:${birthday}`;
    const existingStudentId = await db.get(lookupKey);
    if (existingStudentId) {
      return NextResponse.json({ success: false, error: 'already_registered' }, { status: 400 });
    }

    const studentId = crypto.randomUUID();
    const userKey = `student:${studentId}`;
    const user = { id: studentId, name, birthday, parentPhone, registeredAt: new Date().toISOString() };

    await db.set(userKey, user);
    await db.set(lookupKey, studentId);
    await db.sadd('registered_students', name);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}

