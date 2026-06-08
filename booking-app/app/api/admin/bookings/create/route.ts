import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { sendLineNotification } from '@/lib/notify';

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
    const { studentName, dates, isCompanionMode, companionName } = await request.json();
    if (!studentName || !dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
    }

    // Ensure all dates in the request are unique to avoid self-overlap
    if (new Set(dates).size !== dates.length) {
      return NextResponse.json({ success: false, error: 'already_booked' });
    }

    const db = getDB();

    interface StudentProfile {
      name: string;
      birthday: string;
      parentPhone: string;
    }

    // 4. Find the student profile to retrieve parentPhone
    const studentKeys = await db.keys('student:*');
    let parentPhone = '';
    for (const key of studentKeys) {
      const profile = (await db.get(key)) as StudentProfile | null;
      if (profile && profile.name === studentName) {
        parentPhone = profile.parentPhone;
        break;
      }
    }

    if (!parentPhone) {
      return NextResponse.json({ success: false, error: 'student_not_found' }, { status: 400 });
    }

    // Validate companion registration if companion mode is enabled
    if (isCompanionMode) {
      if (!companionName) {
        return NextResponse.json({ success: false, error: 'invalid_inputs' });
      }
      const isCompanionRegistered = await db.sismember('registered_students', companionName);
      if (isCompanionRegistered !== 1) {
        return NextResponse.json({ success: false, error: 'companion_not_registered' });
      }
    }

    // 5. Booking Limit Check (Max 15 bookings total)
    const mainBookingsCount = await db.scard(`student_bookings:${studentName}`);
    if (mainBookingsCount + dates.length > 15) {
      return NextResponse.json({ success: false, error: 'booking_limit_exceeded' });
    }

    if (isCompanionMode && companionName) {
      const companionBookingsCount = await db.scard(`student_bookings:${companionName}`);
      if (companionBookingsCount + dates.length > 15) {
        return NextResponse.json({ success: false, error: 'booking_limit_exceeded' });
      }
    }



    // 7. Overlap Check & Capacity Check for all dates before modifying state
    for (const date of dates) {
      // Overlap Check for Main Student
      const isMainAlreadyBooked = await db.sismember(`student_bookings:${studentName}`, date);
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

      // Capacity Check
      const rawSlots = await db.get(`booking:${date}`);
      const slots = Array.isArray(rawSlots) ? rawSlots : [];
      const neededSlots = isCompanionMode ? 2 : 1;

      // Query custom capacity override or default to 2 (0 for 3rd week dates)
      const capacityVal = await db.get(`capacity:${date}`);
      const defaultCapacity = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'].includes(date) ? 0 : 2;
      const capacity = typeof capacityVal === 'number' ? capacityVal : defaultCapacity;

      if (slots.length + neededSlots > capacity) {
        return NextResponse.json({ success: false, error: 'insufficient_slots' });
      }
    }

    // 8. All validation checks passed, write bookings
    const bookedAt = new Date().toISOString();
    const fee = isCompanionMode ? 2700 : 3000;

    for (const date of dates) {
      const rawSlots = await db.get(`booking:${date}`);
      const slots = Array.isArray(rawSlots) ? rawSlots : [];

      const mainSlot = {
        studentName,
        parentPhone,
        bookingType: isCompanionMode ? 'companion' : 'single',
        companionName: isCompanionMode ? companionName : null,
        fee,
        bookedAt,
      };

      const newSlots = [...slots, mainSlot];

      if (isCompanionMode && companionName) {
        const companionSlot = {
          studentName: companionName,
          parentPhone,
          bookingType: 'companion',
          companionName: studentName,
          fee,
          bookedAt,
        };
        newSlots.push(companionSlot);
      }

      await db.set(`booking:${date}`, newSlots);

      // Update student bookings sets
      await db.sadd(`student_bookings:${studentName}`, date);
      if (isCompanionMode && companionName) {
        await db.sadd(`student_bookings:${companionName}`, date);
      }
    }

    // 9. Trigger LINE Notification (formatted as MM/DD)
    const formattedDates = dates.map((d) => {
      const parts = d.split('-');
      return `${parts[1]}/${parts[2]}`;
    });

    await sendLineNotification({
      isCompanionMode,
      mainStudent: studentName,
      companionStudent: isCompanionMode ? companionName : null,
      dates: formattedDates,
      parentPhone,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
