import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(request: Request) {
  try {
    // 1. Production Guard
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
    }

    // 2. Admin Authentication Guard
    const adminToken = request.headers.get('x-admin-token');
    if (adminToken !== 'admin_token_validated') {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    // 3. Request Body Parsing & Validation
    const { date, capacity } = await request.json();
    if (!date || typeof capacity !== 'number' || capacity < 0) {
      return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
    }

    // 4. Write to Database
    const db = getDB();
    await db.set(`capacity:${date}`, capacity);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
