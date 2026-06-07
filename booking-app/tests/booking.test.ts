/**
 * @jest-environment node
 */
import { POST as createBooking } from '../app/api/booking/create/route';
import { POST as cancelBooking } from '../app/api/booking/cancel/route';
import { getDB } from '../lib/db';

interface TestBookingSlot {
  studentName: string;
  parentPhone: string;
  bookingType: string;
  companionName: string | null;
  fee: number;
  bookedAt: string;
}

describe('Booking API Endpoints', () => {
  const mockUser = { name: '張三', birthday: '20180815', parentPhone: '0912345678' };

  beforeEach(async () => {
    const db = getDB();
    // Setup mock data
    await db.del('booking:2026-07-20');
    await db.del('booking:2026-08-03'); // Python week Monday
    await db.del('student_bookings:張三');
    await db.del('student_bookings:李四');
    await db.sadd('registered_students', '張三');
    await db.sadd('registered_students', '李四');
    process.env.CHAT_EVERYWHERE_TOKEN = 'mock_token';
    // Spy on fetch to avoid hitting real endpoint
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as unknown as Response)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createHeaders = (user: typeof mockUser) => {
    return {
      'x-user-name': encodeURIComponent(user.name),
      'x-user-birthday': user.birthday,
      'x-user-phone': user.parentPhone
    };
  };

  it('should reject booking requests during Python Class week (08/03 ~ 08/07)', async () => {
    const req = new Request('http://localhost/api/booking/create', {
      method: 'POST',
      headers: createHeaders(mockUser),
      body: JSON.stringify({ date: '2026-08-03', isCompanionMode: false, companionName: null })
    });
    const res = await createBooking(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('date_reserved_for_python');
  });

  it('should prevent booking if student exceeds 15 bookings limit', async () => {
    const db = getDB();
    // Pre-fill 15 bookings
    for (let i = 1; i <= 15; i++) {
      await db.sadd('student_bookings:張三', `2026-07-${i + 10}`);
    }

    const req = new Request('http://localhost/api/booking/create', {
      method: 'POST',
      headers: createHeaders(mockUser),
      body: JSON.stringify({ date: '2026-07-20', isCompanionMode: false, companionName: null })
    });
    const res = await createBooking(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('booking_limit_exceeded');
  });

  it('should allow valid single booking and subtract 1 slot', async () => {
    const req = new Request('http://localhost/api/booking/create', {
      method: 'POST',
      headers: createHeaders(mockUser),
      body: JSON.stringify({ date: '2026-07-20', isCompanionMode: false, companionName: null })
    });
    const res = await createBooking(req);
    const data = await res.json();
    expect(data.success).toBe(true);

    const db = getDB();
    const slots = (await db.get('booking:2026-07-20')) as TestBookingSlot[];
    expect(slots).toHaveLength(1);
    expect(slots[0].fee).toBe(2000);
    expect(slots[0].bookingType).toBe('single');
  });

  it('should fail companion booking if date only has 1 slot left', async () => {
    const db = getDB();
    // Fill 1 slot already
    await db.set('booking:2026-07-20', [{
      studentName: '王五', parentPhone: '0933333333', bookingType: 'single', companionName: null, fee: 2000, bookedAt: new Date().toISOString()
    }]);

    const req = new Request('http://localhost/api/booking/create', {
      method: 'POST',
      headers: createHeaders(mockUser),
      body: JSON.stringify({ date: '2026-07-20', isCompanionMode: true, companionName: '李四' })
    });
    const res = await createBooking(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('insufficient_slots');
  });

  it('should cancel companion bookings in linked fashion', async () => {
    // 1. Create companion booking
    const createReq = new Request('http://localhost/api/booking/create', {
      method: 'POST',
      headers: createHeaders(mockUser),
      body: JSON.stringify({ date: '2026-07-20', isCompanionMode: true, companionName: '李四' })
    });
    await createBooking(createReq);

    // Verify booked slots
    const db = getDB();
    let slots = (await db.get('booking:2026-07-20')) as TestBookingSlot[];
    expect(slots).toHaveLength(2);

    // 2. Cancel booking
    const cancelReq = new Request('http://localhost/api/booking/cancel', {
      method: 'POST',
      headers: createHeaders(mockUser),
      body: JSON.stringify({ date: '2026-07-20' })
    });
    const cancelRes = await cancelBooking(cancelReq);
    const cancelData = await cancelRes.json();
    expect(cancelData.success).toBe(true);

    // Verify slots are completely empty
    slots = (await db.get('booking:2026-07-20')) as TestBookingSlot[];
    expect(slots || []).toHaveLength(0);
  });
});
