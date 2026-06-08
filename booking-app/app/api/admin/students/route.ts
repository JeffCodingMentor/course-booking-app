import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

interface StudentProfile {
  name: string;
  birthday: string;
  parentPhone: string;
}

interface BookingSlot {
  studentName: string;
  parentPhone: string;
  bookingType: 'single' | 'companion';
  companionName: string | null;
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
    const studentKeys = await db.keys('student:*');
    const students = [];

    for (const key of studentKeys) {
      const profile = (await db.get(key)) as StudentProfile | null;
      if (!profile) continue;

      // Get bookings for this student
      const dates = await db.smembers(`student_bookings:${profile.name}`);
      const studentBookings: { date: string; bookingType: string; companionName: string | null; fee: number }[] = [];
      let totalFee = 0;

      for (const date of dates) {
        const rawSlots = await db.get(`booking:${date}`);
        const slots = (Array.isArray(rawSlots) ? rawSlots : []) as BookingSlot[];
        const slot = slots.find((s) => s.studentName === profile.name);
        if (slot) {
          studentBookings.push({
            date,
            bookingType: slot.bookingType,
            companionName: slot.companionName,
            fee: slot.fee,
          });
          totalFee += slot.fee;
        }
      }

      students.push({
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
