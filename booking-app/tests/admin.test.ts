/**
 * @jest-environment node
 */
import { GET as getStudents } from '../app/api/admin/students/route';
import { getDB } from '../lib/db';

interface StudentInfo {
  name: string;
  birthday: string;
  parentPhone: string;
  totalDays: number;
  totalFee: number;
  bookings: { date: string; bookingType: string; companionName: string | null; fee: number }[];
}

describe('Admin Roster & Ledger API', () => {
  beforeEach(async () => {
    const db = getDB();
    // Clear all test students and sets
    await db.del('student:張三:20180815');
    await db.del('student:李四:20180815');
    await db.srem('registered_students', '張三');
    await db.srem('registered_students', '李四');
    await db.del('student_bookings:張三');
    await db.del('student_bookings:李四');
    await db.del('booking:2026-07-20');
    await db.del('booking:2026-07-21');
  });

  it('should return 401 if unauthorized', async () => {
    const req = new Request('http://localhost/api/admin/students', {
      method: 'GET',
    });
    const res = await getStudents(req);
    expect(res.status).toBe(401);
  });

  it('should return empty roster if no students registered', async () => {
    const req = new Request('http://localhost/api/admin/students', {
      method: 'GET',
      headers: {
        'x-admin-token': 'admin_token_validated',
      },
    });
    const res = await getStudents(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.students).toEqual([]);
  });

  it('should return students list with bookings and tuition summary', async () => {
    const db = getDB();

    // Register 張三 and 李四
    await db.set('student:張三:20180815', { name: '張三', birthday: '20180815', parentPhone: '0912345678' });
    await db.sadd('registered_students', '張三');
    await db.set('student:李四:20180815', { name: '李四', birthday: '20180815', parentPhone: '0912345678' });
    await db.sadd('registered_students', '李四');

    // Make booking for 張三 on 07-20 (single)
    await db.set('booking:2026-07-20', [
      {
        studentName: '張三',
        parentPhone: '0912345678',
        bookingType: 'single',
        companionName: null,
        fee: 3000,
        bookedAt: new Date().toISOString(),
      },
    ]);
    await db.sadd('student_bookings:張三', '2026-07-20');

    // Make companion booking for 張三 & 李四 on 07-21 (companion)
    await db.set('booking:2026-07-21', [
      {
        studentName: '張三',
        parentPhone: '0912345678',
        bookingType: 'companion',
        companionName: '李四',
        fee: 2700,
        bookedAt: new Date().toISOString(),
      },
      {
        studentName: '李四',
        parentPhone: '0912345678',
        bookingType: 'companion',
        companionName: '張三',
        fee: 2700,
        bookedAt: new Date().toISOString(),
      },
    ]);
    await db.sadd('student_bookings:張三', '2026-07-21');
    await db.sadd('student_bookings:李四', '2026-07-21');

    const req = new Request('http://localhost/api/admin/students', {
      method: 'GET',
      headers: {
        'x-admin-token': 'admin_token_validated',
      },
    });

    const res = await getStudents(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.students).toHaveLength(2);

    const zhang = data.students.find((s: StudentInfo) => s.name === '張三');
    expect(zhang).toBeDefined();
    expect(zhang.parentPhone).toBe('0912345678');
    expect(zhang.totalDays).toBe(2);
    expect(zhang.totalFee).toBe(5700); // 3000 + 2700
    expect(zhang.bookings).toHaveLength(2);

    const li = data.students.find((s: StudentInfo) => s.name === '李四');
    expect(li).toBeDefined();
    expect(li.totalDays).toBe(1);
    expect(li.totalFee).toBe(2700);
  });
});
