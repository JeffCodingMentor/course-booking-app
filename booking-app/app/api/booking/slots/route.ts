import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

interface StudentProfile {
  id: string;
  name: string;
  birthday: string;
  parentPhone: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) {
      return NextResponse.json({ slots: [] });
    }
    const db = getDB();
    const rawSlots = await db.get(`booking:${date}`) || [];
    const slotsList = Array.isArray(rawSlots) ? rawSlots : [];

    const resolvedSlots = [];
    for (const slot of slotsList) {
      const studentProfile = slot.studentId ? (await db.get(`student:${slot.studentId}`)) as StudentProfile | null : null;
      const companionProfile = slot.companionId ? (await db.get(`student:${slot.companionId}`)) as StudentProfile | null : null;

      resolvedSlots.push({
        studentName: studentProfile ? studentProfile.name : '',
        parentPhone: studentProfile ? studentProfile.parentPhone : '',
        bookingType: slot.bookingType,
        companionName: companionProfile ? companionProfile.name : null,
        fee: slot.fee,
        bookedAt: slot.bookedAt,
      });
    }

    const capacityVal = await db.get(`capacity:${date}`);
    const defaultCapacity = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'].includes(date) ? 0 : 2;
    const capacity = typeof capacityVal === 'number' ? capacityVal : defaultCapacity;
    return NextResponse.json({ slots: resolvedSlots, capacity });
  } catch {
    return NextResponse.json({ slots: [], capacity: 2 });
  }
}
