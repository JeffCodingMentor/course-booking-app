/**
 * @jest-environment node
 */
import { GET as getStudents } from '../app/api/admin/students/route';
import { POST as createStudent } from '../app/api/admin/students/create/route';
import { POST as editStudent } from '../app/api/admin/students/edit/route';
import { POST as deleteStudent } from '../app/api/admin/students/delete/route';
import { POST as createAdminBooking } from '../app/api/admin/bookings/create/route';
import { POST as cancelAdminBooking } from '../app/api/admin/bookings/cancel/route';
import { POST as updateCapacity } from '../app/api/admin/capacity/route';
import { POST as createStudentBooking } from '../app/api/booking/create/route';
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
    // Clear all keys to ensure a clean database state
    const allKeys = await db.keys('*');
    for (const key of allKeys) {
      await db.del(key);
    }
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

    const studentIdZhang = 'std_zhang_id';
    const studentIdLi = 'std_li_id';

    // Register 張三 and 李四
    await db.set(`student:${studentIdZhang}`, { id: studentIdZhang, name: '張三', birthday: '20180815', parentPhone: '0912345678' });
    await db.set(`student_lookup:張三:20180815`, studentIdZhang);
    await db.sadd('registered_students', '張三');

    await db.set(`student:${studentIdLi}`, { id: studentIdLi, name: '李四', birthday: '20180815', parentPhone: '0912345678' });
    await db.set(`student_lookup:李四:20180815`, studentIdLi);
    await db.sadd('registered_students', '李四');

    // Make booking for 張三 on 07-20 (single)
    await db.set('booking:2026-07-20', [
      {
        studentId: studentIdZhang,
        companionId: null,
        bookingType: 'single',
        fee: 3000,
        bookedAt: new Date().toISOString(),
      },
    ]);
    await db.sadd(`student_bookings:${studentIdZhang}`, '2026-07-20');

    // Make companion booking for 張三 & 李四 on 07-21 (companion)
    await db.set('booking:2026-07-21', [
      {
        studentId: studentIdZhang,
        companionId: studentIdLi,
        bookingType: 'companion',
        fee: 2700,
        bookedAt: new Date().toISOString(),
      },
      {
        studentId: studentIdLi,
        companionId: studentIdZhang,
        bookingType: 'companion',
        fee: 2700,
        bookedAt: new Date().toISOString(),
      },
    ]);
    await db.sadd(`student_bookings:${studentIdZhang}`, '2026-07-21');
    await db.sadd(`student_bookings:${studentIdLi}`, '2026-07-21');

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

  describe('Manual Operations', () => {
    beforeEach(() => {
      process.env.CHAT_EVERYWHERE_TOKEN = 'mock_token';
      jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response));
    });

    it('should register a student via admin POST /api/admin/students/create', async () => {
      const req = new Request('http://localhost/api/admin/students/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': 'admin_token_validated' },
        body: JSON.stringify({ name: '王五', birthday: '20180815', parentPhone: '0933333333' }),
      });
      const res = await createStudent(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      const db = getDB();
      const studentId = await db.get('student_lookup:王五:20180815');
      expect(studentId).toBeDefined();

      const profile = await db.get(`student:${studentId}`) as { name: string };
      expect(profile).toBeDefined();
      expect(profile.name).toBe('王五');
      expect(await db.sismember('registered_students', '王五')).toBe(1);
    });

    it('should create manual booking via admin POST /api/admin/bookings/create', async () => {
      const db = getDB();
      const studentId = 'std_zhang_id';
      await db.set(`student:${studentId}`, { id: studentId, name: '張三', birthday: '20180815', parentPhone: '0912345678' });
      await db.set('student_lookup:張三:20180815', studentId);
      await db.sadd('registered_students', '張三');

      const fetchSpy = jest.spyOn(global, 'fetch');
      fetchSpy.mockClear();

      const req = new Request('http://localhost/api/admin/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': 'admin_token_validated' },
        body: JSON.stringify({
          studentName: '張三',
          dates: ['2026-07-20'],
          isCompanionMode: false,
          companionName: null,
        }),
      });

      const res = await createAdminBooking(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      expect(fetchSpy.mock.calls.length).toBe(0);

      const bookings = await db.smembers(`student_bookings:${studentId}`);
      expect(bookings).toContain('2026-07-20');
      
      const slots = await db.get('booking:2026-07-20') as { studentId: string }[];
      expect(slots).toHaveLength(1);
      expect(slots[0].studentId).toBe(studentId);
    });

    it('should cancel manual booking via admin POST /api/admin/bookings/cancel', async () => {
      const db = getDB();
      const studentId = 'std_zhang_id';
      await db.set(`student:${studentId}`, { id: studentId, name: '張三', birthday: '20180815', parentPhone: '0912345678' });
      await db.set('student_lookup:張三:20180815', studentId);
      await db.sadd('registered_students', '張三');
      await db.set('booking:2026-07-20', [
        {
          studentId: studentId,
          companionId: null,
          bookingType: 'single',
          fee: 3000,
          bookedAt: new Date().toISOString(),
        },
      ]);
      await db.sadd(`student_bookings:${studentId}`, '2026-07-20');

      const fetchSpy = jest.spyOn(global, 'fetch');
      fetchSpy.mockClear();

      const req = new Request('http://localhost/api/admin/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': 'admin_token_validated' },
        body: JSON.stringify({
          studentName: '張三',
          date: '2026-07-20',
        }),
      });

      const res = await cancelAdminBooking(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      expect(fetchSpy.mock.calls.length).toBe(0);

      const bookings = await db.smembers(`student_bookings:${studentId}`);
      expect(bookings).not.toContain('2026-07-20');
      
      const slots = await db.get('booking:2026-07-20');
      expect(slots).toBeNull();
    });

    it('should edit student profile via admin POST /api/admin/students/edit', async () => {
      const db = getDB();
      const studentId = 'std_zhang_id';
      await db.set(`student:${studentId}`, { id: studentId, name: '張三', birthday: '20180815', parentPhone: '0912345678' });
      await db.set('student_lookup:張三:20180815', studentId);
      await db.sadd('registered_students', '張三');

      const req = new Request('http://localhost/api/admin/students/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': 'admin_token_validated' },
        body: JSON.stringify({
          id: studentId,
          name: '張小明',
          birthday: '20180816',
          parentPhone: '0988888888',
        }),
      });

      const res = await editStudent(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      expect(await db.get('student_lookup:張三:20180815')).toBeNull();
      expect(await db.get('student_lookup:張小明:20180816')).toBe(studentId);

      const profile = await db.get(`student:${studentId}`) as { name: string; birthday: string; parentPhone: string };
      expect(profile.name).toBe('張小明');
      expect(profile.birthday).toBe('20180816');
      expect(profile.parentPhone).toBe('0988888888');

      expect(await db.sismember('registered_students', '張三')).toBe(0);
      expect(await db.sismember('registered_students', '張小明')).toBe(1);
    });

    it('should delete student profile via admin POST /api/admin/students/delete', async () => {
      const db = getDB();
      const studentId = 'std_zhang_id';
      await db.set(`student:${studentId}`, { id: studentId, name: '張三', birthday: '20180815', parentPhone: '0912345678' });
      await db.set('student_lookup:張三:20180815', studentId);
      await db.sadd('registered_students', '張三');

      await db.sadd(`student_bookings:${studentId}`, '2026-07-20');

      const reqBlocked = new Request('http://localhost/api/admin/students/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': 'admin_token_validated' },
        body: JSON.stringify({ id: studentId }),
      });
      const resBlocked = await deleteStudent(reqBlocked);
      const dataBlocked = await resBlocked.json();
      expect(resBlocked.status).toBe(400);
      expect(dataBlocked.error).toBe('has_bookings');

      expect(await db.get(`student:${studentId}`)).toBeDefined();

      await db.del(`student_bookings:${studentId}`);

      const reqSuccess = new Request('http://localhost/api/admin/students/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': 'admin_token_validated' },
        body: JSON.stringify({ id: studentId }),
      });
      const resSuccess = await deleteStudent(reqSuccess);
      const dataSuccess = await resSuccess.json();
      expect(resSuccess.status).toBe(200);
      expect(dataSuccess.success).toBe(true);

      expect(await db.get(`student:${studentId}`)).toBeNull();
      expect(await db.get('student_lookup:張三:20180815')).toBeNull();
      expect(await db.sismember('registered_students', '張三')).toBe(0);
    });
  });

  describe('Capacity Controls', () => {
    beforeEach(async () => {
      const db = getDB();
      await db.del('capacity:2026-07-20');
      await db.del('booking:2026-07-20');
      await db.del('student_bookings:張三');
      await db.del('student_bookings:李四');
      await db.del('student_bookings:王五');
      await db.del('student_bookings:std_zhang');
      await db.del('student_bookings:std_li');
      await db.del('student_bookings:std_wang');

      // Clear student profiles and lookups
      await db.del('student:std_zhang');
      await db.del('student:std_li');
      await db.del('student:std_wang');
      await db.del('student_lookup:張三:20180815');
      await db.del('student_lookup:李四:20180815');
      await db.del('student_lookup:王五:20180815');

      // Set up mock student profiles
      await db.set('student:std_zhang', { id: 'std_zhang', name: '張三', birthday: '20180815', parentPhone: '0912345678' });
      await db.set('student:std_li', { id: 'std_li', name: '李四', birthday: '20180815', parentPhone: '0912345678' });
      await db.set('student:std_wang', { id: 'std_wang', name: '王五', birthday: '20180815', parentPhone: '0933333333' });

      // Set up lookups
      await db.set('student_lookup:張三:20180815', 'std_zhang');
      await db.set('student_lookup:李四:20180815', 'std_li');
      await db.set('student_lookup:王五:20180815', 'std_wang');

      await db.sadd('registered_students', '張三');
      await db.sadd('registered_students', '李四');
      await db.sadd('registered_students', '王五');
    });

    it('should return 401 if unauthorized', async () => {
      const req = new Request('http://localhost/api/admin/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: '2026-07-20', capacity: 3 }),
      });
      const res = await updateCapacity(req);
      expect(res.status).toBe(401);
    });

    it('should set capacity override in KV', async () => {
      const req = new Request('http://localhost/api/admin/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': 'admin_token_validated' },
        body: JSON.stringify({ date: '2026-07-20', capacity: 3 }),
      });
      const res = await updateCapacity(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      const db = getDB();
      const cap = await db.get('capacity:2026-07-20');
      expect(cap).toBe(3);
    });

    it('should respect custom capacity during student booking', async () => {
      // 1. Set capacity to 1 (allows only 1 student)
      const db = getDB();
      await db.set('capacity:2026-07-20', 1);

      // 2. Book student 1 (張三) -> should succeed
      const headers1 = { 'x-user-id': 'std_zhang' };
      const req1 = new Request('http://localhost/api/booking/create', {
        method: 'POST',
        headers: headers1,
        body: JSON.stringify({ dates: ['2026-07-20'], isCompanionMode: false, companionName: null }),
      });
      const res1 = await createStudentBooking(req1);
      const data1 = await res1.json();
      expect(res1.status).toBe(200);
      expect(data1.success).toBe(true);

      // 3. Book student 2 (李四) -> should fail due to insufficient_slots
      const headers2 = { 'x-user-id': 'std_li' };
      const req2 = new Request('http://localhost/api/booking/create', {
        method: 'POST',
        headers: headers2,
        body: JSON.stringify({ dates: ['2026-07-20'], isCompanionMode: false, companionName: null }),
      });
      const res2 = await createStudentBooking(req2);
      const data2 = await res2.json();
      expect(data2.success).toBe(false);
      expect(data2.error).toBe('insufficient_slots');
    });

    it('should lock date if capacity is set to 0', async () => {
      // 1. Set capacity to 0
      const db = getDB();
      await db.set('capacity:2026-07-20', 0);

      // 2. Book student 1 (張三) -> should fail
      const headers1 = { 'x-user-id': 'std_zhang' };
      const req1 = new Request('http://localhost/api/booking/create', {
        method: 'POST',
        headers: headers1,
        body: JSON.stringify({ dates: ['2026-07-20'], isCompanionMode: false, companionName: null }),
      });
      const res1 = await createStudentBooking(req1);
      const data1 = await res1.json();
      expect(data1.success).toBe(false);
      expect(data1.error).toBe('insufficient_slots');
    });
  });
});

