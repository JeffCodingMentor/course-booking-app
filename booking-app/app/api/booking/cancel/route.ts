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
    const rawName = request.headers.get('x-user-name');
    const mainStudentName = rawName ? decodeURIComponent(rawName) : null;
    const mainStudentBirthday = request.headers.get('x-user-birthday');
    const mainParentPhone = request.headers.get('x-user-phone');

    if (!mainStudentName || !mainStudentBirthday || !mainParentPhone) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const { date } = await request.json();

    if (!date) {
      return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
    }

    const db = getDB();
    const rawSlots = await db.get(`booking:${date}`);
    const slots = (Array.isArray(rawSlots) ? rawSlots : []) as BookingSlot[];

    // Find the slot for the current user
    const userSlotIndex = slots.findIndex((s) => s.studentName === mainStudentName);
    if (userSlotIndex === -1) {
      return NextResponse.json({ success: false, error: 'booking_not_found' });
    }

    const userSlot = slots[userSlotIndex];

    if (userSlot.bookingType === 'companion') {
      // Companion booking: cancel both slots
      const companionName = userSlot.companionName;

      // Filter out both users' slots from this date
      const remainingSlots = slots.filter(
        (s) => s.studentName !== mainStudentName && s.studentName !== companionName
      );

      if (remainingSlots.length === 0) {
        await db.del(`booking:${date}`);
      } else {
        await db.set(`booking:${date}`, remainingSlots);
      }

      // Remove date from both students' booking sets
      await db.srem(`student_bookings:${mainStudentName}`, date);
      if (companionName) {
        await db.srem(`student_bookings:${companionName}`, date);
      }
    } else {
      // Single booking: cancel only user's slot
      const remainingSlots = slots.filter((s) => s.studentName !== mainStudentName);

      if (remainingSlots.length === 0) {
        await db.del(`booking:${date}`);
      } else {
        await db.set(`booking:${date}`, remainingSlots);
      }

      // Remove date from user's booking set
      await db.srem(`student_bookings:${mainStudentName}`, date);
    }

    // Trigger LINE Notification for cancellation
    const parts = date.split('-');
    const formattedDate = `${parts[1]}/${parts[2]}`;
    await sendLineCancelNotification({
      isCompanionMode: userSlot.bookingType === 'companion',
      mainStudent: mainStudentName,
      companionStudent: userSlot.bookingType === 'companion' ? userSlot.companionName : null,
      dates: [formattedDate],
      parentPhone: mainParentPhone
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
