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

    // Validate companion registration if companion mode is enabled
    let companionId = '';
    if (isCompanionMode) {
      if (!companionName) {
        return NextResponse.json({ success: false, error: 'invalid_inputs' });
      }
      const isCompanionRegistered = await db.sismember('registered_students', companionName);
      if (isCompanionRegistered !== 1) {
        return NextResponse.json({ success: false, error: 'companion_not_registered' });
      }

      for (const key of studentKeys) {
        const profile = (await db.get(key)) as StudentProfile | null;
        if (profile && profile.name === companionName) {
          companionId = profile.id;
          break;
        }
      }

      if (!companionId) {
        return NextResponse.json({ success: false, error: 'companion_not_registered' });
      }
    }

    // 5. Booking Limit Check (Max 15 bookings total)
    const mainBookingsCount = await db.scard(`student_bookings:${studentId}`);
    if (mainBookingsCount + dates.length > 15) {
      return NextResponse.json({ success: false, error: 'booking_limit_exceeded' });
    }

    if (isCompanionMode && companionId) {
      const companionBookingsCount = await db.scard(`student_bookings:${companionId}`);
      if (companionBookingsCount + dates.length > 15) {
        return NextResponse.json({ success: false, error: 'booking_limit_exceeded' });
      }
    }

    // 7. Overlap Check & Capacity Check for all dates before modifying state
    for (const date of dates) {
      // Overlap Check for Main Student
      const isMainAlreadyBooked = await db.sismember(`student_bookings:${studentId}`, date);
      if (isMainAlreadyBooked === 1) {
        return NextResponse.json({ success: false, error: 'already_booked' });
      }

      // Overlap Check for Companion
      if (isCompanionMode && companionId) {
        const isCompanionAlreadyBooked = await db.sismember(`student_bookings:${companionId}`, date);
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
        studentId,
        companionId: isCompanionMode ? companionId : null,
        bookingType: isCompanionMode ? 'companion' : 'single',
        fee,
        bookedAt,
      };

      const newSlots = [...slots, mainSlot];

      if (isCompanionMode && companionId) {
        const companionSlot = {
          studentId: companionId,
          companionId: studentId,
          bookingType: 'companion',
          fee,
          bookedAt,
        };
        newSlots.push(companionSlot);
      }

      await db.set(`booking:${date}`, newSlots);

      // Update student bookings sets
      await db.sadd(`student_bookings:${studentId}`, date);
      if (isCompanionMode && companionId) {
        await db.sadd(`student_bookings:${companionId}`, date);
      }
    }

    // 9. Bypass LINE notification per requirement
    /*
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
    */

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}

