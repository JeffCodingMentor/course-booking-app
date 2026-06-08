import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { sendLineCancelNotification } from '@/lib/notify';

interface DBBookingSlot {
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
    const studentId = request.headers.get('x-user-id');
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const db = getDB();
    const mainStudentProfile = (await db.get(`student:${studentId}`)) as StudentProfile | null;
    if (!mainStudentProfile) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const mainStudentName = mainStudentProfile.name;
    const mainParentPhone = mainStudentProfile.parentPhone;

    const { date } = await request.json();

    if (!date) {
      return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
    }

    const rawSlots = await db.get(`booking:${date}`);
    const slots = (Array.isArray(rawSlots) ? rawSlots : []) as DBBookingSlot[];

    // Find the slot for the current user
    const userSlotIndex = slots.findIndex((s) => s.studentId === studentId);
    if (userSlotIndex === -1) {
      return NextResponse.json({ success: false, error: 'booking_not_found' });
    }

    const userSlot = slots[userSlotIndex];
    let companionName: string | null = null;
    const companionId = userSlot.companionId;

    if (userSlot.bookingType === 'companion' && companionId) {
      // Resolve companion's name from database for the LINE Notification
      const companionProfile = (await db.get(`student:${companionId}`)) as StudentProfile | null;
      companionName = companionProfile ? companionProfile.name : null;

      // Filter out both users' slots from this date
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
      await db.srem(`student_bookings:${companionId}`, date);
    } else {
      // Single booking: cancel only user's slot
      const remainingSlots = slots.filter((s) => s.studentId !== studentId);

      if (remainingSlots.length === 0) {
        await db.del(`booking:${date}`);
      } else {
        await db.set(`booking:${date}`, remainingSlots);
      }

      // Remove date from user's booking set
      await db.srem(`student_bookings:${studentId}`, date);
    }

    // Trigger LINE Notification for cancellation
    const parts = date.split('-');
    const formattedDate = `${parts[1]}/${parts[2]}`;
    await sendLineCancelNotification({
      isCompanionMode: userSlot.bookingType === 'companion',
      mainStudent: mainStudentName,
      companionStudent: userSlot.bookingType === 'companion' ? companionName : null,
      dates: [formattedDate],
      parentPhone: mainParentPhone
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
