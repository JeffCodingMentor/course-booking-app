import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { sendLineCancelNotification } from '@/lib/notify';

interface BookingSlot {
  studentName: string;
  parentPhone: string;
  bookingType: 'single' | 'companion';
  companionName: string | null;
  fee: number;
  bookedAt: string;
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
    const rawSlots = await db.get(`booking:${date}`);
    const slots = (Array.isArray(rawSlots) ? rawSlots : []) as BookingSlot[];

    // 4. Find the slot for the target student
    const studentSlotIndex = slots.findIndex((s) => s.studentName === studentName);
    if (studentSlotIndex === -1) {
      return NextResponse.json({ success: false, error: 'booking_not_found' });
    }

    const studentSlot = slots[studentSlotIndex];

    // 5. Handle Single or Companion cancellation
    if (studentSlot.bookingType === 'companion') {
      const companionName = studentSlot.companionName;

      // Filter out both students' slots from this date
      const remainingSlots = slots.filter(
        (s) => s.studentName !== studentName && s.studentName !== companionName
      );

      if (remainingSlots.length === 0) {
        await db.del(`booking:${date}`);
      } else {
        await db.set(`booking:${date}`, remainingSlots);
      }

      // Remove date from both students' booking sets
      await db.srem(`student_bookings:${studentName}`, date);
      if (companionName) {
        await db.srem(`student_bookings:${companionName}`, date);
      }
    } else {
      // Single booking: cancel only target student's slot
      const remainingSlots = slots.filter((s) => s.studentName !== studentName);

      if (remainingSlots.length === 0) {
        await db.del(`booking:${date}`);
      } else {
        await db.set(`booking:${date}`, remainingSlots);
      }

      // Remove date from target student's booking set
      await db.srem(`student_bookings:${studentName}`, date);
    }

    // 6. Trigger LINE Notification for cancellation (formatted as MM/DD)
    const parts = date.split('-');
    const formattedDate = `${parts[1]}/${parts[2]}`;
    await sendLineCancelNotification({
      isCompanionMode: studentSlot.bookingType === 'companion',
      mainStudent: studentName,
      companionStudent: studentSlot.bookingType === 'companion' ? studentSlot.companionName : null,
      dates: [formattedDate],
      parentPhone: studentSlot.parentPhone,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
