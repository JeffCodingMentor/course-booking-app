# Database Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Course Booking Application to use an ID-centric database schema, enabling safe student name and birthday editing and safe deletion.

**Architecture:** Use `studentId` as the unique identifier across all data collections, store secondary name/birthday lookup indexes, and perform API name-resolution in slots queries.

**Tech Stack:** Next.js, Vercel KV / Upstash Redis, Jest

---

## File Structure Map
* `booking-app/lib/db.ts` — Mock DB helper file (unchanged API, but verified).
* `booking-app/app/api/auth/login/route.ts` — Authentication login endpoint (updated to use lookup index).
* `booking-app/app/api/auth/register/route.ts` — Registration endpoint (updated to generate `studentId` and write index).
* `booking-app/app/api/booking/slots/route.ts` — Slots listing endpoint (updated to resolve IDs to names).
* `booking-app/app/api/booking/create/route.ts` — Booking creation endpoint (updated to use `studentId` in slots and sets).
* `booking-app/app/api/booking/cancel/route.ts` — Booking cancellation endpoint (updated to use `studentId` in slots and sets).
* `booking-app/app/api/admin/students/route.ts` — Admin roster query endpoint (updated to fetch profiles and resolve names).
* `booking-app/app/api/admin/students/create/route.ts` — Admin student creation endpoint (updated to generate ID and write index).
* `booking-app/app/api/admin/students/edit/route.ts` — Admin student edit endpoint (New API to support safe rename/birthday change).
* `booking-app/app/api/admin/students/delete/route.ts` — Admin student delete endpoint (New API to safely delete student if no bookings exist).
* `booking-app/app/api/admin/bookings/create/route.ts` — Admin manual booking endpoint (updated to use `studentId`).
* `booking-app/app/api/admin/bookings/cancel/route.ts` — Admin manual cancellation endpoint (updated to use `studentId`).
* `booking-app/app/page.tsx` — Student client page (updated to send `x-user-id` header).
* `booking-app/app/admin/dashboard/page.tsx` — Admin dashboard UI (updated to include Edit and Delete controls).

---

## Tasks

### Task 1: Auth & Registration API Refactor
**Files:**
* Modify: `booking-app/app/api/auth/login/route.ts`
* Modify: `booking-app/app/api/auth/register/route.ts`
* Modify: `booking-app/tests/auth.test.ts`

- [ ] **Step 1: Write test updates in `tests/auth.test.ts`**
  Modify `booking-app/tests/auth.test.ts` to clear `student_lookup:張三:20180815` in `beforeEach` and verify `user.id` is returned.
  ```typescript
  // Replace beforeEach in tests/auth.test.ts
  beforeEach(async () => {
    const db = getDB();
    await db.del('student_lookup:張三:20180815');
    await db.srem('registered_students', '張三');
    // Clear dynamic student IDs
    const keys = await db.keys('student:*');
    for (const key of keys) {
      if (!key.startsWith('student_bookings:')) {
        await db.del(key);
      }
    }
  });
  ```
- [ ] **Step 2: Run auth tests to verify failure**
  Run: `npx jest tests/auth.test.ts`
  Expected: FAIL (or error due to key mismatch)
- [ ] **Step 3: Modify `/api/auth/register` to write ID and secondary index**
  Replace `booking-app/app/api/auth/register/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';

  export async function POST(request: Request) {
    try {
      const { name, birthday, parentPhone } = await request.json();
      if (!name || !birthday || !parentPhone) {
        return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
      }
      const db = getDB();
      
      const lookupKey = `student_lookup:${name}:${birthday}`;
      const existingId = await db.get(lookupKey);
      if (existingId) {
        return NextResponse.json({ success: false, error: 'already_registered' });
      }

      const studentId = `std_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
      const user = { id: studentId, name, birthday, parentPhone, registeredAt: new Date().toISOString() };
      
      await db.set(`student:${studentId}`, user);
      await db.set(lookupKey, studentId);
      await db.sadd('registered_students', name);

      return NextResponse.json({ success: true, user });
    } catch {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```
- [ ] **Step 4: Modify `/api/auth/login` to read secondary index first**
  Replace `booking-app/app/api/auth/login/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';

  export async function POST(request: Request) {
    try {
      const { name, birthday } = await request.json();
      if (!name || !birthday) {
        return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
      }
      const db = getDB();
      const studentId = await db.get(`student_lookup:${name}:${birthday}`) as string | null;
      if (!studentId) {
        return NextResponse.json({ success: false, error: 'not_registered' });
      }
      const user = await db.get(`student:${studentId}`);
      if (!user) {
        return NextResponse.json({ success: false, error: 'not_registered' });
      }
      return NextResponse.json({ success: true, user });
    } catch {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```
- [ ] **Step 5: Run auth tests to verify they pass**
  Run: `npx jest tests/auth.test.ts`
  Expected: PASS
- [ ] **Step 6: Commit**
  ```bash
  git add booking-app/app/api/auth/ booking-app/tests/auth.test.ts
  git commit -m "feat(auth): refactor login and registration to use studentId and lookup index"
  ```

---

### Task 2: Student Booking APIs & Slots Query Refactor
**Files:**
* Modify: `booking-app/app/api/booking/slots/route.ts`
* Modify: `booking-app/app/api/booking/create/route.ts`
* Modify: `booking-app/app/api/booking/cancel/route.ts`
* Modify: `booking-app/tests/booking.test.ts`

- [ ] **Step 1: Write test updates in `tests/booking.test.ts`**
  Modify `booking-app/tests/booking.test.ts` to fetch `studentId` using lookup index and pass it via `x-user-id` header.
  ```typescript
  // Replace headers creation in tests/booking.test.ts
  const createHeaders = async (user: typeof mockUser) => {
    const db = getDB();
    const studentId = await db.get(`student_lookup:${user.name}:${user.birthday}`) || 'test_id';
    return {
      'x-user-id': studentId,
      'x-user-name': encodeURIComponent(user.name),
      'x-user-birthday': user.birthday,
      'x-user-phone': user.parentPhone
    };
  };
  // Update beforeEach in tests/booking.test.ts to clean lookups
  beforeEach(async () => {
    const db = getDB();
    await db.del('booking:2026-07-20');
    await db.del('booking:2026-08-03');
    // Clear all student profiles, lookups, and bookings
    const keys = await db.keys('student:*');
    for (const k of keys) await db.del(k);
    const lookups = await db.keys('student_lookup:*');
    for (const k of lookups) await db.del(k);
    
    // Setup mock students
    await db.set('student:std_zhang', { id: 'std_zhang', name: '張三', birthday: '20180815', parentPhone: '0912345678' });
    await db.set('student_lookup:張三:20180815', 'std_zhang');
    await db.sadd('registered_students', '張三');

    await db.set('student:std_li', { id: 'std_li', name: '李四', birthday: '20180815', parentPhone: '0912345678' });
    await db.set('student_lookup:李四:20180815', 'std_li');
    await db.sadd('registered_students', '李四');

    process.env.CHAT_EVERYWHERE_TOKEN = 'mock_token';
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response)
    );
  });
  ```
- [ ] **Step 2: Run booking tests to verify failure**
  Run: `npx jest tests/booking.test.ts`
  Expected: FAIL
- [ ] **Step 3: Refactor Slots GET API to resolve IDs**
  Replace `booking-app/app/api/booking/slots/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';

  interface DBBookingSlot {
    studentId: string;
    bookingType: 'single' | 'companion';
    companionId: string | null;
    fee: number;
    bookedAt: string;
  }

  export async function GET(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const date = searchParams.get('date');
      if (!date) {
        return NextResponse.json({ slots: [], capacity: 2 });
      }
      const db = getDB();
      const rawSlots = (await db.get(`booking:${date}`) || []) as DBBookingSlot[];
      
      const resolvedSlots = [];
      for (const slot of rawSlots) {
        const studentProfile = await db.get(`student:${slot.studentId}`) as any;
        let companionName = null;
        if (slot.companionId) {
          const companionProfile = await db.get(`student:${slot.companionId}`) as any;
          companionName = companionProfile ? companionProfile.name : null;
        }
        resolvedSlots.push({
          studentName: studentProfile ? studentProfile.name : '未知學生',
          parentPhone: studentProfile ? studentProfile.parentPhone : '',
          bookingType: slot.bookingType,
          companionName,
          fee: slot.fee,
          bookedAt: slot.bookedAt
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
  ```
- [ ] **Step 4: Refactor Booking Create API to write IDs**
  Replace `booking-app/app/api/booking/create/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';
  import { sendLineNotification } from '@/lib/notify';

  export async function POST(request: Request) {
    try {
      const studentId = request.headers.get('x-user-id');
      const db = getDB();
      
      let profile: any = null;
      if (studentId) {
        profile = await db.get(`student:${studentId}`);
      }

      if (!profile) {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }

      const mainStudentName = profile.name;
      const mainParentPhone = profile.parentPhone;
      const { dates, isCompanionMode, companionName } = await request.json();

      if (!dates || !Array.isArray(dates) || dates.length === 0) {
        return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
      }

      if (new Set(dates).size !== dates.length) {
        return NextResponse.json({ success: false, error: 'already_booked' });
      }

      let companionId: string | null = null;
      if (isCompanionMode) {
        if (!companionName) {
          return NextResponse.json({ success: false, error: 'invalid_inputs' });
        }
        const isCompanionRegistered = await db.sismember('registered_students', companionName);
        if (isCompanionRegistered !== 1) {
          return NextResponse.json({ success: false, error: 'companion_not_registered' });
        }
        
        // Find companion ID
        const studentKeys = await db.keys('student:*');
        for (const key of studentKeys) {
          if (!key.startsWith('student_bookings:')) {
            const p = await db.get(key) as any;
            if (p && p.name === companionName) {
              companionId = p.id;
              break;
            }
          }
        }
        if (!companionId) {
          return NextResponse.json({ success: false, error: 'companion_not_registered' });
        }
      }

      // Check limits
      const mainBookingsCount = await db.scard(`student_bookings:${profile.id}`);
      if (mainBookingsCount + dates.length > 15) {
        return NextResponse.json({ success: false, error: 'booking_limit_exceeded' });
      }

      if (isCompanionMode && companionId) {
        const companionBookingsCount = await db.scard(`student_bookings:${companionId}`);
        if (companionBookingsCount + dates.length > 15) {
          return NextResponse.json({ success: false, error: 'booking_limit_exceeded' });
        }
      }

      // Overlap and Capacity checks
      for (const date of dates) {
        const isMainAlreadyBooked = await db.sismember(`student_bookings:${profile.id}`, date);
        if (isMainAlreadyBooked === 1) {
          return NextResponse.json({ success: false, error: 'already_booked' });
        }

        if (isCompanionMode && companionId) {
          const isCompanionAlreadyBooked = await db.sismember(`student_bookings:${companionId}`, date);
          if (isCompanionAlreadyBooked === 1) {
            return NextResponse.json({ success: false, error: 'companion_already_booked' });
          }
        }

        const rawSlots = await db.get(`booking:${date}`);
        const slots = Array.isArray(rawSlots) ? rawSlots : [];
        const neededSlots = isCompanionMode ? 2 : 1;

        const capacityVal = await db.get(`capacity:${date}`);
        const defaultCapacity = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'].includes(date) ? 0 : 2;
        const capacity = typeof capacityVal === 'number' ? capacityVal : defaultCapacity;

        if (slots.length + neededSlots > capacity) {
          return NextResponse.json({ success: false, error: 'insufficient_slots' });
        }
      }

      // Write bookings
      const bookedAt = new Date().toISOString();
      const fee = isCompanionMode ? 2700 : 3000;

      for (const date of dates) {
        const rawSlots = await db.get(`booking:${date}`);
        const slots = Array.isArray(rawSlots) ? rawSlots : [];

        const mainSlot = {
          studentId: profile.id,
          bookingType: isCompanionMode ? 'companion' : 'single',
          companionId: isCompanionMode ? companionId : null,
          fee,
          bookedAt
        };

        const newSlots = [...slots, mainSlot];

        if (isCompanionMode && companionId) {
          const companionSlot = {
            studentId: companionId,
            bookingType: 'companion',
            companionId: profile.id,
            fee,
            bookedAt
          };
          newSlots.push(companionSlot);
        }

        await db.set(`booking:${date}`, newSlots);
        await db.sadd(`student_bookings:${profile.id}`, date);
        if (isCompanionMode && companionId) {
          await db.sadd(`student_bookings:${companionId}`, date);
        }
      }

      // Notify
      const formattedDates = dates.map(d => {
        const parts = d.split('-');
        return `${parts[1]}/${parts[2]}`;
      });
      await sendLineNotification({
        isCompanionMode,
        mainStudent: mainStudentName,
        companionStudent: isCompanionMode ? companionName : null,
        dates: formattedDates,
        parentPhone: mainParentPhone
      });

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```
- [ ] **Step 5: Refactor Booking Cancel API to operate on IDs**
  Replace `booking-app/app/api/booking/cancel/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';
  import { sendLineCancelNotification } from '@/lib/notify';

  interface BookingSlot {
    studentId: string;
    bookingType: 'single' | 'companion';
    companionId: string | null;
    fee: number;
    bookedAt: string;
  }

  export async function POST(request: Request) {
    try {
      const studentId = request.headers.get('x-user-id');
      const db = getDB();
      
      let profile: any = null;
      if (studentId) {
        profile = await db.get(`student:${studentId}`);
      }

      if (!profile) {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }

      const { date } = await request.json();
      if (!date) {
        return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
      }

      const rawSlots = await db.get(`booking:${date}`);
      const slots = (Array.isArray(rawSlots) ? rawSlots : []) as BookingSlot[];

      const userSlotIndex = slots.findIndex((s) => s.studentId === profile.id);
      if (userSlotIndex === -1) {
        return NextResponse.json({ success: false, error: 'booking_not_found' });
      }

      const userSlot = slots[userSlotIndex];

      if (userSlot.bookingType === 'companion') {
        const companionId = userSlot.companionId;
        const remainingSlots = slots.filter(
          (s) => s.studentId !== profile.id && s.studentId !== companionId
        );

        if (remainingSlots.length === 0) {
          await db.del(`booking:${date}`);
        } else {
          await db.set(`booking:${date}`, remainingSlots);
        }

        await db.srem(`student_bookings:${profile.id}`, date);
        if (companionId) {
          await db.srem(`student_bookings:${companionId}`, date);
        }

        // Fetch companion name for LINE Notify
        let companionName = null;
        if (companionId) {
          const cp = await db.get(`student:${companionId}`) as any;
          companionName = cp ? cp.name : null;
        }

        const parts = date.split('-');
        const formattedDate = `${parts[1]}/${parts[2]}`;
        await sendLineCancelNotification({
          isCompanionMode: true,
          mainStudent: profile.name,
          companionStudent: companionName,
          dates: [formattedDate],
          parentPhone: profile.parentPhone
        });
      } else {
        const remainingSlots = slots.filter((s) => s.studentId !== profile.id);

        if (remainingSlots.length === 0) {
          await db.del(`booking:${date}`);
        } else {
          await db.set(`booking:${date}`, remainingSlots);
        }

        await db.srem(`student_bookings:${profile.id}`, date);

        const parts = date.split('-');
        const formattedDate = `${parts[1]}/${parts[2]}`;
        await sendLineCancelNotification({
          isCompanionMode: false,
          mainStudent: profile.name,
          companionStudent: null,
          dates: [formattedDate],
          parentPhone: profile.parentPhone
        });
      }

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```
- [ ] **Step 6: Run booking tests to verify they pass**
  Run: `npx jest tests/booking.test.ts`
  Expected: PASS
- [ ] **Step 7: Commit**
  ```bash
  git add booking-app/app/api/booking/ booking-app/tests/booking.test.ts
  git commit -m "feat(booking): update bookings create, cancel, and slots to use ID-centric schema"
  ```

---

### Task 3: Admin APIs Refactor (Ledger, Bookings, Capacity, Edit, Delete)
**Files:**
* Modify: `booking-app/app/api/admin/students/route.ts`
* Modify: `booking-app/app/api/admin/students/create/route.ts`
* Create: `booking-app/app/api/admin/students/edit/route.ts`
* Create: `booking-app/app/api/admin/students/delete/route.ts`
* Modify: `booking-app/app/api/admin/bookings/create/route.ts`
* Modify: `booking-app/app/api/admin/bookings/cancel/route.ts`
* Modify: `booking-app/tests/admin.test.ts`

- [ ] **Step 1: Write test updates in `tests/admin.test.ts`**
  Modify tests to support student IDs and test Edit/Delete APIs, and bypass LINE notifications on admin edits.
  ```typescript
  // Update beforeEach and tests in tests/admin.test.ts to use Student ID structures.
  // We'll write the full test suites checking Edit student, Delete student, and Admin Booking without Notify.
  ```
- [ ] **Step 2: Run admin tests to verify failure**
  Run: `npx jest tests/admin.test.ts`
  Expected: FAIL (edit/delete endpoints not found, and notifications failing assertions if sent)
- [ ] **Step 3: Modify `GET /api/admin/students` list API**
  Replace `booking-app/app/api/admin/students/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';

  interface StudentProfile {
    id: string;
    name: string;
    birthday: string;
    parentPhone: string;
  }

  interface DBBookingSlot {
    studentId: string;
    bookingType: 'single' | 'companion';
    companionId: string | null;
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
        if (key.startsWith('student_bookings:')) continue;
        const profile = (await db.get(key)) as StudentProfile | null;
        if (!profile) continue;

        const dates = await db.smembers(`student_bookings:${profile.id}`);
        const studentBookings = [];
        let totalFee = 0;

        for (const date of dates) {
          const rawSlots = await db.get(`booking:${date}`) as DBBookingSlot[] || [];
          const slot = rawSlots.find((s) => s.studentId === profile.id);
          if (slot) {
            let companionName = null;
            if (slot.companionId) {
              const cp = await db.get(`student:${slot.companionId}`) as StudentProfile | null;
              companionName = cp ? cp.name : null;
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

      students.sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ success: true, students });
    } catch {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```
- [ ] **Step 4: Modify `POST /api/admin/students/create`**
  Replace `booking-app/app/api/admin/students/create/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';

  export async function POST(request: Request) {
    try {
      const adminToken = request.headers.get('x-admin-token');
      if (adminToken !== 'admin_token_validated') {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }

      const { name, birthday, parentPhone } = await request.json();
      if (!name || !birthday || !parentPhone) {
        return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
      }

      const db = getDB();
      const lookupKey = `student_lookup:${name}:${birthday}`;
      const existingId = await db.get(lookupKey);
      if (existingId) {
        return NextResponse.json({ success: false, error: 'already_registered' }, { status: 400 });
      }

      const studentId = `std_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
      await db.set(`student:${studentId}`, { id: studentId, name, birthday, parentPhone });
      await db.set(lookupKey, studentId);
      await db.sadd('registered_students', name);

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```
- [ ] **Step 5: Implement `POST /api/admin/students/edit`**
  Create `booking-app/app/api/admin/students/edit/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';

  export async function POST(request: Request) {
    try {
      const adminToken = request.headers.get('x-admin-token');
      if (adminToken !== 'admin_token_validated') {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }

      const { studentId, name, birthday, parentPhone } = await request.json();
      if (!studentId || !name || !birthday || !parentPhone) {
        return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
      }

      const db = getDB();
      const oldProfile = await db.get(`student:${studentId}`) as any;
      if (!oldProfile) {
        return NextResponse.json({ success: false, error: 'student_not_found' }, { status: 404 });
      }

      const newLookupKey = `student_lookup:${name}:${birthday}`;
      const existingId = await db.get(newLookupKey) as string | null;
      if (existingId && existingId !== studentId) {
        return NextResponse.json({ success: false, error: 'duplicate_student' }, { status: 400 });
      }

      // If name or birthday changed, update lookup indexes
      if (oldProfile.name !== name || oldProfile.birthday !== birthday) {
        await db.del(`student_lookup:${oldProfile.name}:${oldProfile.birthday}`);
        await db.set(newLookupKey, studentId);

        if (oldProfile.name !== name) {
          await db.srem('registered_students', oldProfile.name);
          await db.sadd('registered_students', name);
        }
      }

      await db.set(`student:${studentId}`, { id: studentId, name, birthday, parentPhone });
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```
- [ ] **Step 6: Implement `POST /api/admin/students/delete`**
  Create `booking-app/app/api/admin/students/delete/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';

  export async function POST(request: Request) {
    try {
      const adminToken = request.headers.get('x-admin-token');
      if (adminToken !== 'admin_token_validated') {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }

      const { studentId } = await request.json();
      if (!studentId) {
        return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
      }

      const db = getDB();
      const bookingsCount = await db.scard(`student_bookings:${studentId}`);
      if (bookingsCount > 0) {
        return NextResponse.json({ success: false, error: 'has_bookings' }, { status: 400 });
      }

      const profile = await db.get(`student:${studentId}`) as any;
      if (profile) {
        await db.del(`student:${studentId}`);
        await db.del(`student_lookup:${profile.name}:${profile.birthday}`);
        await db.srem('registered_students', profile.name);
      }

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```
- [ ] **Step 7: Refactor Admin Booking Create & Cancel APIs (Bypass LINE Notify)**
  * Update `booking-app/app/api/admin/bookings/create/route.ts`:
    * Look up student profile by name. Find `studentId`.
    * Verify capacity and limits based on `studentId`.
    * Write `studentId` and `companionId` to booking slot list and sets.
    * **DO NOT call `sendLineNotification`.**
  * Update `booking-app/app/api/admin/bookings/cancel/route.ts`:
    * Identify slot index by `studentId` (or `studentName` after looking up `studentId`).
    * Remove from slots and sets.
    * **DO NOT call `sendLineCancelNotification`.**
- [ ] **Step 8: Run admin tests to verify they pass**
  Run: `npx jest tests/admin.test.ts`
  Expected: PASS
- [ ] **Step 9: Commit**
  ```bash
  git add booking-app/app/api/admin/ booking-app/tests/admin.test.ts
  git commit -m "feat(admin): implement ID-centric ledger list, admin edit, delete, and manual bookings without notify"
  ```

---

### Task 4: Frontend UI Integration
**Files:**
* Modify: `booking-app/app/page.tsx`
* Modify: `booking-app/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Update `page.tsx` headers**
  Pass `x-user-id` header in student client requests (`booking/create`, `booking/cancel` calls).
- [ ] **Step 2: Add Edit & Delete UI in `/admin/dashboard/page.tsx`**
  * Roster tab: Display an "編輯" (Edit) button next to each student's card.
    * Click Edit -> opens edit modal. Submits changes to `/api/admin/students/edit`.
  * Roster tab: Display a "刪除" (Delete) button on the student card.
    * Click Delete -> verifies booking count. If > 0, show warning banner. Otherwise, prompts confirmation and calls `/api/admin/students/delete`.
- [ ] **Step 3: Run full verification build**
  Run in `booking-app/`: `npm run lint` and `npm run test` and `npm run build`.
  Expected: All green, successful compile.
- [ ] **Step 4: Commit**
  ```bash
  git add booking-app/app/page.tsx booking-app/app/admin/dashboard/page.tsx
  git commit -m "feat(ui): add edit and delete controls in admin roster view and connect x-user-id headers"
  ```
- [ ] **Step 5: Push to remote**
  Run: `git push origin main`
