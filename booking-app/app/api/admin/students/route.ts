import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

interface StudentProfile {
  id: string;
  name: string;
  birthday: string;
  parentPhone: string;
}

interface BookingSlot {
  studentId: string;
  companionId: string | null;
  bookingType: 'single' | 'companion';
  fee: number;
  bookedAt: string;
}

export async function GET(request: Request) {
  try {
    const adminToken = request.headers.get('x-admin-token');
    if (adminToken !== 'admin_token_validated') {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const db = getDB();
    const allKeys = await db.keys('student:*');
    // Filter to only include student:${studentId} keys, not student_lookup or student_bookings
    const studentKeys = allKeys.filter(
      (key) => key.startsWith('student:') && !key.startsWith('student_lookup:') && !key.startsWith('student_bookings:')
    );
    const students = [];

    for (const key of studentKeys) {
      const profile = (await db.get(key)) as StudentProfile | null;
      if (!profile || !profile.id) continue;

      const studentId = profile.id;

      // Get bookings for this student
      const dates = await db.smembers(`student_bookings:${studentId}`);
      const studentBookings: { date: string; bookingType: string; companionName: string | null; fee: number }[] = [];
      let totalFee = 0;

      for (const date of dates) {
        const rawSlots = await db.get(`booking:${date}`);
        const slots = (Array.isArray(rawSlots) ? rawSlots : []) as BookingSlot[];
        const slot = slots.find((s) => s.studentId === studentId);
        if (slot) {
          let companionName: string | null = null;
          if (slot.companionId) {
            const companionProfile = (await db.get(`student:${slot.companionId}`)) as StudentProfile | null;
            if (companionProfile) {
              companionName = companionProfile.name;
            }
          }
          studentBookings.push({
            date,
            bookingType: slot.bookingType,
            companionName,
            fee: slot.fee,
          });
          totalFee += slot.fee;
        }
      }

      students.push({
        id: profile.id,
        name: profile.name,
        birthday: profile.birthday,
        parentPhone: profile.parentPhone,
        totalDays: studentBookings.length,
        totalFee,
        bookings: studentBookings.sort((a, b) => a.date.localeCompare(b.date)),
      });
    }

    // Sort students by name alphabetically
    students.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ success: true, students });
  } catch {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}

