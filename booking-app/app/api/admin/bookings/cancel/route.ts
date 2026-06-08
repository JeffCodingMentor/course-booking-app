import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

interface BookingSlot {
  studentId: string;
  companionId: string | null;
  bookingType: 'single' | 'companion';
  fee: number;
  bookedAt: string;
}

interface StudentProfile {
  id: string;
  name: string;
  birthday: string;
  parentPhone: string;
}

export async function POST(request: Request) {
  try {
    // 2. Admin Authentication Guard
    const adminToken = request.headers.get('x-admin-token');
    if (adminToken !== 'admin_token_validated') {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    // 3. Request Body Parsing & Validation
    const { studentName, date } = await request.json();
    if (!studentName || !date) {
      return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
    }

    const db = getDB();

    // 4. Find the student profile to retrieve studentId
    const allKeys = await db.keys('student:*');
    const studentKeys = allKeys.filter(
      (key) => key.startsWith('student:') && !key.startsWith('student_lookup:') && !key.startsWith('student_bookings:')
    );

    let studentId = '';
    for (const key of studentKeys) {
      const profile = (await db.get(key)) as StudentProfile | null;
      if (profile && profile.name === studentName) {
        studentId = profile.id;
        break;
      }
    }

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'student_not_found' }, { status: 400 });
    }

    const rawSlots = await db.get(`booking:${date}`);
    const slots = (Array.isArray(rawSlots) ? rawSlots : []) as BookingSlot[];

    // Find the slot for the target student
    const studentSlotIndex = slots.findIndex((s) => s.studentId === studentId);
    if (studentSlotIndex === -1) {
      return NextResponse.json({ success: false, error: 'booking_not_found' });
    }

    const studentSlot = slots[studentSlotIndex];

    // 5. Handle Single or Companion cancellation
    if (studentSlot.bookingType === 'companion') {
      const companionId = studentSlot.companionId;

      // Filter out both students' slots from this date
      const remainingSlots = slots.filter(
        (s) => s.studentId !== studentId && s.studentId !== companionId
      );

      if (remainingSlots.length === 0) {
        await db.del(`booking:${date}`);
      } else {
        await db.set(`booking:${date}`, remainingSlots);
      }

      // Remove date from both students' booking sets
      await db.srem(`student_bookings:${studentId}`, date);
      if (companionId) {
        await db.srem(`student_bookings:${companionId}`, date);
      }
    } else {
      // Single booking: cancel only target student's slot
      const remainingSlots = slots.filter((s) => s.studentId !== studentId);

      if (remainingSlots.length === 0) {
        await db.del(`booking:${date}`);
      } else {
        await db.set(`booking:${date}`, remainingSlots);
      }

      // Remove date from target student's booking set
      await db.srem(`student_bookings:${studentId}`, date);
    }

    // 6. Bypass LINE notification per requirement
    /*
    const parts = date.split('-');
    const formattedDate = `${parts[1]}/${parts[2]}`;
    await sendLineCancelNotification({
      isCompanionMode: studentSlot.bookingType === 'companion',
      mainStudent: studentName,
      companionStudent: studentSlot.bookingType === 'companion' ? companionName : null,
      dates: [formattedDate],
      parentPhone: studentSlot.parentPhone,
    });
    */

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}

