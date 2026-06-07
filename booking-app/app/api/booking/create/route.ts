import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { sendLineNotification } from '@/lib/notify';

export async function POST(request: Request) {
  try {
    const rawName = request.headers.get('x-user-name');
    const mainStudentName = rawName ? decodeURIComponent(rawName) : null;
    const mainStudentBirthday = request.headers.get('x-user-birthday');
    const mainParentPhone = request.headers.get('x-user-phone');

    if (!mainStudentName || !mainStudentBirthday || !mainParentPhone) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const { date, isCompanionMode, companionName } = await request.json();

    if (!date) {
      return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
    }

    // 1. Python Class Week restriction (08/03 ~ 08/07)
    const pythonWeek = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'];
    if (pythonWeek.includes(date)) {
      return NextResponse.json({ success: false, error: 'date_reserved_for_python' });
    }

    const db = getDB();

    // 2. Validate companion registration if companion mode is enabled
    if (isCompanionMode) {
      if (!companionName) {
        return NextResponse.json({ success: false, error: 'invalid_inputs' });
      }
      const isCompanionRegistered = await db.sismember('registered_students', companionName);
      if (isCompanionRegistered !== 1) {
        return NextResponse.json({ success: false, error: 'companion_not_registered' });
      }
    }

    // 3. Booking Limit Check (Max 15 bookings total)
    const mainBookingsCount = await db.scard(`student_bookings:${mainStudentName}`);
    if (mainBookingsCount >= 15) {
      return NextResponse.json({ success: false, error: 'booking_limit_exceeded' });
    }

    if (isCompanionMode && companionName) {
      const companionBookingsCount = await db.scard(`student_bookings:${companionName}`);
      if (companionBookingsCount >= 15) {
        return NextResponse.json({ success: false, error: 'booking_limit_exceeded' });
      }
    }

    // 4. Overlap Check for Main Student
    const isMainAlreadyBooked = await db.sismember(`student_bookings:${mainStudentName}`, date);
    if (isMainAlreadyBooked === 1) {
      return NextResponse.json({ success: false, error: 'already_booked' });
    }

    // Overlap Check for Companion
    if (isCompanionMode && companionName) {
      const isCompanionAlreadyBooked = await db.sismember(`student_bookings:${companionName}`, date);
      if (isCompanionAlreadyBooked === 1) {
        return NextResponse.json({ success: false, error: 'companion_already_booked' });
      }
    }

    // 5. Capacity Check
    const rawSlots = await db.get(`booking:${date}`);
    const slots = Array.isArray(rawSlots) ? rawSlots : [];

    const neededSlots = isCompanionMode ? 2 : 1;
    if (slots.length + neededSlots > 2) {
      return NextResponse.json({ success: false, error: 'insufficient_slots' });
    }

    // 6. Record Bookings
    const bookedAt = new Date().toISOString();
    const fee = isCompanionMode ? 1800 : 2000;

    const mainSlot = {
      studentName: mainStudentName,
      parentPhone: mainParentPhone,
      bookingType: isCompanionMode ? 'companion' : 'single',
      companionName: isCompanionMode ? companionName : null,
      fee,
      bookedAt
    };

    const newSlots = [...slots, mainSlot];

    if (isCompanionMode && companionName) {
      const companionSlot = {
        studentName: companionName,
        parentPhone: mainParentPhone,
        bookingType: 'companion',
        companionName: mainStudentName,
        fee,
        bookedAt
      };
      newSlots.push(companionSlot);
    }

    await db.set(`booking:${date}`, newSlots);

    // Update student bookings sets
    await db.sadd(`student_bookings:${mainStudentName}`, date);
    if (isCompanionMode && companionName) {
      await db.sadd(`student_bookings:${companionName}`, date);
    }

    // 7. Trigger LINE Notification
    const dateParts = date.split('-');
    const mmdd = `${dateParts[1]}/${dateParts[2]}`;
    await sendLineNotification({
      isCompanionMode,
      mainStudent: mainStudentName,
      companionStudent: isCompanionMode ? companionName : null,
      dates: [mmdd],
      parentPhone: mainParentPhone
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
