# Course Booking System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a course registration and 2-person group booking system with full-stack Next.js, Vercel KV, and ChatEverywhere LINE notifications, styled with premium Vanilla CSS.

**Architecture:** A Next.js App Router project located in the `booking-app/` subdirectory. Data persistence is handled via Vercel KV (Redis) with a fallback local in-memory/JSON DB mock for offline testing. A single-page React frontend manages login and booking calendar states dynamically.

**Tech Stack:** Next.js (TypeScript, App Router), `@vercel/kv`, Vanilla CSS, Jest + React Testing Library (for unit and integration tests).

---

## File Structure Map
* `booking-app/package.json` — Dependency management.
* `booking-app/lib/db.ts` — Redis client connection with offline JSON/in-memory mock fallback.
* `booking-app/app/api/auth/login/route.ts` — User login verification endpoint.
* `booking-app/app/api/auth/register/route.ts` — User registration endpoint.
* `booking-app/app/api/auth/validate-companion/route.ts` — Companion user validation endpoint.
* `booking-app/app/api/booking/create/route.ts` — Course date booking creation endpoint.
* `booking-app/app/api/booking/cancel/route.ts` — Course date booking cancellation endpoint.
* `booking-app/lib/notify.ts` — ChatEverywhere LINE Notify sender client.
* `booking-app/app/page.tsx` — Main single-page interactive view.
* `booking-app/app/globals.css` — Core Vanilla CSS styling system.
* `booking-app/tests/` — Jest test suites.

---

## Tasks

### Task 1: Next.js Project Scaffolding & Setup

**Files:**
* Create: `booking-app/next.config.js`
* Create: `booking-app/jest.config.js`
* Create: `booking-app/tests/jest.setup.js`
* Create: `booking-app/app/layout.tsx`

- [ ] **Step 1: Scaffold Next.js App Router project**
  Run this command in the workspace root (`D:/Jeff/myStudy/antigravity/summer26`):
  `npx -y create-next-app@latest booking-app --ts --eslint --app --import-alias "@/*" --no-tailwind --use-npm --yes`

- [ ] **Step 2: Clean up default styles and setup empty layouts**
  Replace `booking-app/app/page.tsx` with a blank page:
  ```tsx
  export default function Home() {
    return <div>Scaffolded</div>;
  }
  ```
  Replace `booking-app/app/globals.css` with a blank sheet.

- [ ] **Step 3: Install Jest and Testing dependencies**
  Run in `booking-app/` directory:
  `npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @types/jest ts-node`

- [ ] **Step 4: Configure Jest**
  Write to `booking-app/jest.config.js`:
  ```javascript
  const nextJest = require('next/jest');
  const createJestConfig = nextJest({ dir: './' });
  const customJestConfig = {
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
    moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }
  };
  module.exports = createJestConfig(customJestConfig);
  ```
  Write to `booking-app/tests/jest.setup.js`:
  ```javascript
  import '@testing-library/jest-dom';
  ```

- [ ] **Step 5: Run npm run dev to verify setup**
  Run in `booking-app/`: `npm run build` to verify successful scaffolding compilation.
  Expected: Successful compilation without errors.

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add booking-app/
  git commit -m "chore: scaffold Next.js app and configure testing environment"
  ```

---

### Task 2: Vercel KV Client & Offline Database Mock

**Files:**
* Create: `booking-app/lib/db.ts`
* Test: `booking-app/tests/db.test.ts`

- [ ] **Step 1: Install Vercel KV SDK**
  Run in `booking-app/`: `npm install @vercel/kv`

- [ ] **Step 2: Write failing test for the database client**
  Write to `booking-app/tests/db.test.ts`:
  ```typescript
  import { getDB } from '../lib/db';

  describe('Database Driver', () => {
    it('should set and get values correctly', async () => {
      const db = getDB();
      await db.set('test_key', 'hello');
      const val = await db.get('test_key');
      expect(val).toBe('hello');
    });
  });
  ```

- [ ] **Step 3: Run the test to verify failure**
  Run in `booking-app/`: `npx jest tests/db.test.ts`
  Expected: FAIL (Cannot find module '../lib/db' or 'getDB' is not defined).

- [ ] **Step 4: Implement db.ts with in-memory fallback for local tests**
  Write to `booking-app/lib/db.ts`:
  ```typescript
  import { kv } from '@vercel/kv';

  class MemoryDB {
    private store: Map<string, string> = new Map();
    private sets: Map<string, Set<string>> = new Map();

    async get(key: string): Promise<any> {
      const val = this.store.get(key);
      return val ? JSON.parse(val) : null;
    }

    async set(key: string, value: any): Promise<string> {
      this.store.set(key, JSON.stringify(value));
      return 'OK';
    }

    async del(key: string): Promise<number> {
      return this.store.delete(key) ? 1 : 0;
    }

    async sismember(key: string, member: string): Promise<number> {
      const set = this.sets.get(key);
      return set && set.has(member) ? 1 : 0;
    }

    async sadd(key: string, member: string): Promise<number> {
      if (!this.sets.has(key)) {
        this.sets.set(key, new Set());
      }
      const set = this.sets.get(key)!;
      if (set.has(member)) return 0;
      set.add(member);
      return 1;
    }

    async srem(key: string, member: string): Promise<number> {
      const set = this.sets.get(key);
      if (set && set.has(member)) {
        set.delete(member);
        return 1;
      }
      return 0;
    }

    async scard(key: string): Promise<number> {
      const set = this.sets.get(key);
      return set ? set.size : 0;
    }
  }

  const mockDbInstance = new MemoryDB();

  export function getDB() {
    // If running in Vercel production with KV variables set, use @vercel/kv
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      return kv;
    }
    // Otherwise return our mock in-memory database for offline tests
    return mockDbInstance;
  }
  ```

- [ ] **Step 5: Run the test to verify it passes**
  Run in `booking-app/`: `npx jest tests/db.test.ts`
  Expected: PASS

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add booking-app/lib/db.ts booking-app/tests/db.test.ts
  git commit -m "feat: implement database client with offline memory fallback"
  ```

---

### Task 3: Authentication & Registration APIs

**Files:**
* Create: `booking-app/app/api/auth/login/route.ts`
* Create: `booking-app/app/api/auth/register/route.ts`
* Create: `booking-app/app/api/auth/validate-companion/route.ts`
* Test: `booking-app/tests/auth.test.ts`

- [ ] **Step 1: Write failing integration tests for Authentication APIs**
  Write to `booking-app/tests/auth.test.ts`:
  ```typescript
  import { NextRequest } from 'next/server';
  import { POST as loginPost } from '../app/api/auth/login/route';
  import { POST as registerPost } from '../app/api/auth/register/route';
  import { GET as validateGet } from '../app/api/auth/validate-companion/route';
  import { getDB } from '../lib/db';

  describe('Auth API Routes', () => {
    beforeEach(async () => {
      const db = getDB();
      await db.del('student:張三:20180815');
      await db.srem('registered_students', '張三');
    });

    it('should fail login if student is not registered', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '張三', birthday: '20180815', parentPhone: '0912345678' })
      });
      const res = await loginPost(req as any);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('not_registered');
    });

    it('should register a new student and then succeed login', async () => {
      const regReq = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '張三', birthday: '20180815', parentPhone: '0912345678' })
      });
      const regRes = await registerPost(regReq as any);
      const regData = await regRes.json();
      expect(regData.success).toBe(true);

      const logReq = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '張三', birthday: '20180815', parentPhone: '0912345678' })
      });
      const logRes = await loginPost(logReq as any);
      const logData = await logRes.json();
      expect(logData.success).toBe(true);
      expect(logData.user.name).toBe('張三');
    });

    it('should validate if companion is registered', async () => {
      // Validate non-registered companion
      const valReq1 = new Request('http://localhost/api/auth/validate-companion?name=張三');
      const valRes1 = await validateGet(valReq1 as any);
      const valData1 = await valRes1.json();
      expect(valData1.valid).toBe(false);

      // Register companion
      const regReq = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '張三', birthday: '20180815', parentPhone: '0912345678' })
      });
      await registerPost(regReq as any);

      // Validate registered companion
      const valReq2 = new Request('http://localhost/api/auth/validate-companion?name=張三');
      const valRes2 = await validateGet(valReq2 as any);
      const valData2 = await valRes2.json();
      expect(valData2.valid).toBe(true);
    });
  });
  ```

- [ ] **Step 2: Run the test to verify failure**
  Run in `booking-app/`: `npx jest tests/auth.test.ts`
  Expected: FAIL (routes do not exist)

- [ ] **Step 3: Implement Auth Login endpoint**
  Write to `booking-app/app/api/auth/login/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';

  export async function POST(request: Request) {
    try {
      const { name, birthday, parentPhone } = await request.json();
      if (!name || !birthday) {
        return NextResponse.json({ success: false, error: 'invalid_inputs' }, { status: 400 });
      }
      const db = getDB();
      const user = await db.get(`student:${name}:${birthday}`);
      if (!user) {
        return NextResponse.json({ success: false, error: 'not_registered' });
      }
      // Return user context
      return NextResponse.json({ success: true, user });
    } catch (err) {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```

- [ ] **Step 4: Implement Auth Register endpoint**
  Write to `booking-app/app/api/auth/register/route.ts`:
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
      const userKey = `student:${name}:${birthday}`;
      const user = { name, birthday, parentPhone, registeredAt: new Date().toISOString() };
      
      await db.set(userKey, user);
      await db.sadd('registered_students', name);

      return NextResponse.json({ success: true, user });
    } catch (err) {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```

- [ ] **Step 5: Implement Validate Companion endpoint**
  Write to `booking-app/app/api/auth/validate-companion/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';

  export async function GET(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const name = searchParams.get('name');
      if (!name) {
        return NextResponse.json({ valid: false, error: 'missing_name' }, { status: 400 });
      }
      const db = getDB();
      const isMember = await db.sismember('registered_students', name);
      return NextResponse.json({ valid: isMember === 1 });
    } catch (err) {
      return NextResponse.json({ valid: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```

- [ ] **Step 6: Run tests to verify they pass**
  Run in `booking-app/`: `npx jest tests/auth.test.ts`
  Expected: PASS

- [ ] **Step 7: Commit**
  Run:
  ```bash
  git add booking-app/app/api/auth/ booking-app/tests/auth.test.ts
  git commit -m "feat: add user authentication, registration and companion validation API endpoints"
  ```

---

### Task 4: ChatEverywhere LINE Notify Integration Client

**Files:**
* Create: `booking-app/lib/notify.ts`
* Test: `booking-app/tests/notify.test.ts`

- [ ] **Step 1: Write failing test for the notification utility**
  Write to `booking-app/tests/notify.test.ts`:
  ```typescript
  import { sendLineNotification } from '../lib/notify';

  describe('LINE Notify Client via ChatEverywhere', () => {
    let fetchMock: jest.SpyInstance;

    beforeEach(() => {
      fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as any)
      );
      process.env.CHAT_EVERYWHERE_TOKEN = 'mock_secret_token';
    });

    afterEach(() => {
      fetchMock.mockRestore();
      delete process.env.CHAT_EVERYWHERE_TOKEN;
    });

    it('should post single booking message to ChatEverywhere API in markdown format', async () => {
      const payload = {
        isCompanionMode: false,
        mainStudent: '張三',
        companionStudent: null,
        dates: ['07/20'],
        parentPhone: '0912345678'
      };

      const result = await sendLineNotification(payload);
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://v2.chateverywhere.app/api/line/notify',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer mock_secret_token',
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('## 新預約：')
        })
      );
    });

    it('should post companion booking message to ChatEverywhere API in markdown format', async () => {
      const payload = {
        isCompanionMode: true,
        mainStudent: '張三',
        companionStudent: '李四',
        dates: ['07/20'],
        parentPhone: '0912345678'
      };

      const result = await sendLineNotification(payload);
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://v2.chateverywhere.app/api/line/notify',
        expect.objectContaining({
          body: expect.stringContaining('## 新預約（兩人同行）：')
        })
      );
    });
  });
  ```

- [ ] **Step 2: Run the test to verify failure**
  Run in `booking-app/`: `npx jest tests/notify.test.ts`
  Expected: FAIL (Cannot find module '../lib/notify')

- [ ] **Step 3: Implement notification client**
  Write to `booking-app/lib/notify.ts`:
  ```typescript
  export interface NotifyPayload {
    isCompanionMode: boolean;
    mainStudent: string;
    companionStudent: string | null;
    dates: string[];
    parentPhone: string;
  }

  export async function sendLineNotification(payload: NotifyPayload): Promise<boolean> {
    const token = process.env.CHAT_EVERYWHERE_TOKEN;
    if (!token) {
      console.warn('CHAT_EVERYWHERE_TOKEN environment variable is not defined. Skipping notification.');
      return false;
    }

    const dateListStr = payload.dates.join('、');
    let message = '';

    if (payload.isCompanionMode && payload.companionStudent) {
      message = `## 新預約（兩人同行）：\n- 預約人： ${payload.mainStudent}\n- 同行者： ${payload.companionStudent}\n- 日期： ${dateListStr}\n- 電話： ${payload.parentPhone}`;
    } else {
      message = `## 新預約：\n- 學生： ${payload.mainStudent}\n- 日期： ${dateListStr}\n- 電話： ${payload.parentPhone}`;
    }

    try {
      const response = await fetch('https://v2.chateverywhere.app/api/line/notify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          markdown: true
        })
      });

      if (!response.ok) {
        console.error('ChatEverywhere LINE API returned HTTP error:', response.status);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to connect to ChatEverywhere LINE API:', err);
      return false;
    }
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**
  Run in `booking-app/`: `npx jest tests/notify.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add booking-app/lib/notify.ts booking-app/tests/notify.test.ts
  git commit -m "feat: implement ChatEverywhere LINE Notify integration client"
  ```

---

### Task 5: Booking APIs with Validation Guards

**Files:**
* Create: `booking-app/app/api/booking/create/route.ts`
* Create: `booking-app/app/api/booking/cancel/route.ts`
* Test: `booking-app/tests/booking.test.ts`

- [ ] **Step 1: Write integration tests for Booking validation and writing rules**
  Write to `booking-app/tests/booking.test.ts`:
  ```typescript
  import { POST as createBooking } from '../app/api/booking/create/route';
  import { POST as cancelBooking } from '../app/api/booking/cancel/route';
  import { getDB } from '../lib/db';

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
      jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({ ok: true, json: () => ({}) } as any));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const createHeaders = (user: typeof mockUser) => {
      return {
        'x-user-name': user.name,
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
      const res = await createBooking(req as any);
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
      const res = await createBooking(req as any);
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
      const res = await createBooking(req as any);
      const data = await res.json();
      expect(data.success).toBe(true);

      const db = getDB();
      const slots = await db.get('booking:2026-07-20');
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
      const res = await createBooking(req as any);
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
      await createBooking(createReq as any);

      // Verify booked slots
      const db = getDB();
      let slots = await db.get('booking:2026-07-20');
      expect(slots).toHaveLength(2);

      // 2. Cancel booking
      const cancelReq = new Request('http://localhost/api/booking/cancel', {
        method: 'POST',
        headers: createHeaders(mockUser),
        body: JSON.stringify({ date: '2026-07-20' })
      });
      const cancelRes = await cancelBooking(cancelReq as any);
      const cancelData = await cancelRes.json();
      expect(cancelData.success).toBe(true);

      // Verify slots are completely empty
      slots = await db.get('booking:2026-07-20');
      expect(slots || []).toHaveLength(0);
    });
  });
  ```

- [ ] **Step 2: Run test to verify failure**
  Run in `booking-app/`: `npx jest tests/booking.test.ts`
  Expected: FAIL (endpoints do not exist)

- [ ] **Step 3: Implement Booking Create API endpoint**
  Write to `booking-app/app/api/booking/create/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';
  import { sendLineNotification } from '@/lib/notify';

  export async function POST(request: Request) {
    try {
      // Extract user headers populated by authentication session
      const name = request.headers.get('x-user-name');
      const birthday = request.headers.get('x-user-birthday');
      const parentPhone = request.headers.get('x-user-phone');

      if (!name || !birthday || !parentPhone) {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }

      const { date, isCompanionMode, companionName } = await request.json();

      // Guard 1: Python Class reserved week (2026-08-03 to 2026-08-07)
      const targetDate = new Date(date);
      const pythonStart = new Date('2026-08-03');
      const pythonEnd = new Date('2026-08-07');
      if (targetDate >= pythonStart && targetDate <= pythonEnd) {
        return NextResponse.json({ success: false, error: 'date_reserved_for_python' });
      }

      const db = getDB();

      // Guard 2: Total booking limit check (max 15)
      const mainBookingsCount = await db.scard(`student_bookings:${name}`);
      if (mainBookingsCount >= 15) {
        return NextResponse.json({ success: false, error: 'booking_limit_exceeded' });
      }

      // Guard 3: Companion validation and limit check
      if (isCompanionMode) {
        if (!companionName) {
          return NextResponse.json({ success: false, error: 'companion_name_required' });
        }
        const companionRegistered = await db.sismember('registered_students', companionName);
        if (companionRegistered !== 1) {
          return NextResponse.json({ success: false, error: 'companion_unregistered' });
        }
        const companionBookingsCount = await db.scard(`student_bookings:${companionName}`);
        if (companionBookingsCount >= 15) {
          return NextResponse.json({ success: false, error: 'companion_limit_exceeded' });
        }
      }

      // Guard 4: Overlap checks
      const mainOverlaps = await db.sismember(`student_bookings:${name}`, date);
      if (mainOverlaps === 1) {
        return NextResponse.json({ success: false, error: 'student_already_booked' });
      }
      if (isCompanionMode && companionName) {
        const companionOverlaps = await db.sismember(`student_bookings:${companionName}`, date);
        if (companionOverlaps === 1) {
          return NextResponse.json({ success: false, error: 'companion_already_booked' });
        }
      }

      // Guard 5: Available capacity check
      const currentBookings = (await db.get(`booking:${date}`)) || [];
      const slotsFilled = currentBookings.reduce((acc: number, curr: any) => {
        return acc + (curr.bookingType === 'companion' ? 2 : 1);
      }, 0);

      const requiredSlots = isCompanionMode ? 2 : 1;
      if (slotsFilled + requiredSlots > 2) {
        return NextResponse.json({ success: false, error: 'insufficient_slots' });
      }

      // Write booking slots
      const newBookingTime = new Date().toISOString();
      const newSlots = [...currentBookings];

      if (isCompanionMode && companionName) {
        newSlots.push(
          {
            studentName: name,
            parentPhone: parentPhone,
            bookingType: 'companion',
            companionName: companionName,
            fee: 1800,
            bookedAt: newBookingTime
          },
          {
            studentName: companionName,
            parentPhone: parentPhone,
            bookingType: 'companion',
            companionName: name,
            fee: 1800,
            bookedAt: newBookingTime
          }
        );
        await db.sadd(`student_bookings:${name}`, date);
        await db.sadd(`student_bookings:${companionName}`, date);
      } else {
        newSlots.push({
          studentName: name,
          parentPhone: parentPhone,
          bookingType: 'single',
          companionName: null,
          fee: 2000,
          bookedAt: newBookingTime
        });
        await db.sadd(`student_bookings:${name}`, date);
      }

      await db.set(`booking:${date}`, newSlots);

      // Trigger LINE Notification via ChatEverywhere API
      const mmdd = `${date.split('-')[1]}/${date.split('-')[2]}`;
      await sendLineNotification({
        isCompanionMode: isCompanionMode,
        mainStudent: name,
        companionStudent: isCompanionMode ? companionName : null,
        dates: [mmdd],
        parentPhone: parentPhone
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```

- [ ] **Step 4: Implement Booking Cancel API endpoint**
  Write to `booking-app/app/api/booking/cancel/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';

  export async function POST(request: Request) {
    try {
      const name = request.headers.get('x-user-name');
      if (!name) {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }

      const { date } = await request.json();
      const db = getDB();

      const currentSlots: any[] = (await db.get(`booking:${date}`)) || [];
      const userSlot = currentSlots.find((s) => s.studentName === name);

      if (!userSlot) {
        return NextResponse.json({ success: false, error: 'booking_not_found' });
      }

      let updatedSlots: any[] = [];
      if (userSlot.bookingType === 'companion') {
        const companionName = userSlot.companionName;
        // Linked cancellation: remove both companion slots
        updatedSlots = currentSlots.filter(
          (s) => s.studentName !== name && s.studentName !== companionName
        );
        await db.srem(`student_bookings:${name}`, date);
        if (companionName) {
          await db.srem(`student_bookings:${companionName}`, date);
        }
      } else {
        // Single cancellation: remove only self slot
        updatedSlots = currentSlots.filter((s) => s.studentName !== name);
        await db.srem(`student_bookings:${name}`, date);
      }

      await db.set(`booking:${date}`, updatedSlots);

      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
  }
  ```

- [ ] **Step 5: Run tests to verify they pass**
  Run in `booking-app/`: `npx jest tests/booking.test.ts`
  Expected: PASS

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add booking-app/app/api/booking/ booking-app/tests/booking.test.ts
  git commit -m "feat: implement booking creation and cancellation API routes with validations"
  ```

---

### Task 6: Premium Single-Page Interactive View (Vanilla CSS Frontend)

**Files:**
* Modify: `booking-app/app/page.tsx` — Incorporate full interactive calendar and registration views.
* Modify: `booking-app/app/globals.css` — Write CSS custom variables, layout systems, grid components, hover tools, and slide-in animations.

- [ ] **Step 1: Write styling parameters**
  Write to `booking-app/app/globals.css` using sleek modern CSS variables and styling classes:
  ```css
  :root {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --accent-indigo: #6366f1;
    --accent-emerald: #10b981;
    --accent-rose: #f43f5e;
    --accent-amber: #f59e0b;
    --border-color: #334155;
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  }

  body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-sans);
    margin: 0;
    padding: 0;
  }

  /* Page Wrapper */
  .app-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  /* Login Card Grid */
  .login-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 2.5rem;
    max-width: 450px;
    margin: 6rem auto;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  }

  .login-card h1 {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
    text-align: center;
    color: var(--accent-indigo);
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--accent-indigo);
  }

  .submit-btn {
    width: 100%;
    padding: 0.75rem;
    background: var(--accent-indigo);
    border: none;
    border-radius: 6px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .submit-btn:hover {
    background: #4f46e5;
  }

  /* Dashboard Header */
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 1.5rem;
    margin-bottom: 2rem;
  }

  .profile-stats {
    display: flex;
    gap: 1.5rem;
    margin-top: 0.5rem;
  }

  .stat-badge {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    padding: 0.35rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .stat-badge strong {
    color: var(--text-primary);
  }

  .logout-btn {
    background: transparent;
    border: 1px solid var(--accent-rose);
    color: var(--accent-rose);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .logout-btn:hover {
    background: var(--accent-rose);
    color: white;
  }

  /* Calendar Grid System */
  .calendar-section {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 2rem;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .grid-header {
    font-weight: 600;
    text-align: center;
    color: var(--text-secondary);
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .date-cell {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: border-color 0.2s;
    position: relative;
  }

  .date-number {
    font-weight: 600;
    font-size: 1rem;
  }

  .slot-indicator {
    font-size: 0.875rem;
    color: var(--accent-emerald);
    margin: 0.5rem 0;
  }

  .cell-btn {
    padding: 0.35rem 0.5rem;
    background: var(--accent-indigo);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 0.75rem;
    cursor: pointer;
    font-weight: 600;
  }

  .cell-btn:hover {
    background: #4f46e5;
  }

  /* Specific states */
  .date-cell.fully-booked {
    opacity: 0.5;
  }

  .date-cell.fully-booked .slot-indicator {
    color: var(--accent-rose);
  }

  .date-cell.my-booking {
    border-color: var(--accent-emerald);
    background: rgba(16, 185, 129, 0.05);
  }

  .cancel-btn {
    padding: 0.35rem 0.5rem;
    background: var(--accent-rose);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .cancel-btn:hover {
    background: #e11d48;
  }

  /* Reserved Class style and tooltip */
  .date-cell.python-reserved {
    background: rgba(245, 158, 11, 0.1);
    border-color: var(--accent-amber);
    cursor: help;
  }

  .date-cell.python-reserved::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 105%;
    left: 50%;
    transform: translateX(-50%);
    background: #000;
    color: #fff;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s;
    z-index: 10;
  }

  .date-cell.python-reserved:hover::after {
    opacity: 1;
    visibility: visible;
  }

  /* Companion Controls */
  .companion-controls {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    padding: 1.25rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  /* Popup Dialogs */
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }

  .dialog-box {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    padding: 2rem;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    text-align: center;
  }

  .dialog-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .dialog-btn {
    padding: 0.5rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }

  .dialog-btn.confirm {
    background: var(--accent-indigo);
    border: none;
    color: white;
  }

  .dialog-btn.cancel {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
  }
  ```

- [ ] **Step 2: Implement full page.tsx state engine and renders**
  Write to `booking-app/app/page.tsx`:
  ```tsx
  'use client';

  import { useState, useEffect } from 'react';

  interface User {
    name: string;
    birthday: string;
    parentPhone: string;
  }

  interface Slot {
    studentName: string;
    parentPhone: string;
    bookingType: 'single' | 'companion';
    companionName: string | null;
    fee: number;
  }

  export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ name: '', birthday: '', parentPhone: '' });
    const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
    const [isCompanionMode, setIsCompanionMode] = useState(false);
    const [companionName, setCompanionName] = useState('');
    const [companionStatus, setCompanionStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
    const [bookings, setBookings] = useState<Record<string, Slot[]>>({});
    const [myBookedDates, setMyBookedDates] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState<{ date: string } | null>(null);
    const [showTeacherContactAlert, setShowTeacherContactAlert] = useState(false);

    // Hydrate Session
    useEffect(() => {
      const saved = localStorage.getItem('booking_user');
      if (saved) {
        const u = JSON.parse(saved);
        setUser(u);
        fetchCalendarData(u.name);
      }
    }, []);

    const fetchCalendarData = async (studentName: string) => {
      setLoading(true);
      try {
        const dates = getCalendarDates();
        const bookingsMap: Record<string, Slot[]> = {};
        const personalDates: string[] = [];

        for (const d of dates) {
          const res = await fetch(`/api/booking/slots?date=${d}`);
          if (res.ok) {
            const data = await res.json();
            bookingsMap[d] = data.slots || [];
            if (data.slots?.some((s: Slot) => s.studentName === studentName)) {
              personalDates.push(d);
            }
          }
        }
        setBookings(bookingsMap);
        setMyBookedDates(personalDates);
      } catch (err) {
        console.error('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    // Auto-validate companion name input with debounce
    useEffect(() => {
      if (!companionName) {
        setCompanionStatus('idle');
        return;
      }
      setCompanionStatus('validating');
      const delay = setTimeout(async () => {
        try {
          const res = await fetch(`/api/auth/validate-companion?name=${encodeURIComponent(companionName)}`);
          const data = await res.json();
          setCompanionStatus(data.valid ? 'valid' : 'invalid');
        } catch {
          setCompanionStatus('invalid');
        }
      }, 500);
      return () => clearTimeout(delay);
    }, [companionName]);

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          localStorage.setItem('booking_user', JSON.stringify(data.user));
          fetchCalendarData(data.user.name);
        } else if (data.error === 'not_registered') {
          setShowRegisterPrompt(true);
        }
      } catch {
        alert('Server connection error');
      } finally {
        setLoading(false);
      }
    };

    const handleRegister = async () => {
      setShowRegisterPrompt(false);
      setLoading(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          localStorage.setItem('booking_user', JSON.stringify(data.user));
          fetchCalendarData(data.user.name);
        }
      } catch {
        alert('Registration failed');
      } finally {
        setLoading(false);
      }
    };

    const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('booking_user');
      setFormData({ name: '', birthday: '', parentPhone: '' });
      setIsCompanionMode(false);
      setCompanionName('');
      setCompanionStatus('idle');
      setBookings({});
      setMyBookedDates([]);
    };

    const getCalendarDates = () => {
      const dates: string[] = [];
      const start = new Date('2026-07-20');
      for (let w = 0; w < 6; w++) {
        for (let d = 0; d < 5; d++) {
          const date = new Date(start);
          date.setDate(start.getDate() + w * 7 + d);
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          dates.push(`${yyyy}-${mm}-${dd}`);
        }
      }
      return dates;
    };

    const handleBook = async (date: string) => {
      if (isCompanionMode && companionStatus !== 'valid') {
        alert('Please enter a valid registered companion student name.');
        return;
      }
      setShowConfirmModal({ date });
    };

    const executeBooking = async () => {
      if (!showConfirmModal || !user) return;
      const date = showConfirmModal.date;
      setShowConfirmModal(null);
      setLoading(true);

      try {
        const res = await fetch('/api/booking/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-name': user.name,
            'x-user-birthday': user.birthday,
            'x-user-phone': user.parentPhone
          },
          body: JSON.stringify({ date, isCompanionMode, companionName })
        });
        const data = await res.json();
        if (data.success) {
          setShowTeacherContactAlert(true);
          fetchCalendarData(user.name);
        } else {
          alert(`Booking failed: ${data.error}`);
        }
      } catch {
        alert('Booking connection failed');
      } finally {
        setLoading(false);
      }
    };

    const handleCancel = async (date: string) => {
      if (!user) return;
      if (!confirm('Are you sure you want to cancel this booking? If this was a companion booking, both slots will be canceled.')) return;
      setLoading(true);

      try {
        const res = await fetch('/api/booking/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-name': user.name
          },
          body: JSON.stringify({ date })
        });
        const data = await res.json();
        if (data.success) {
          fetchCalendarData(user.name);
        } else {
          alert(`Cancellation failed: ${data.error}`);
        }
      } catch {
        alert('Cancellation connection failed');
      } finally {
        setLoading(false);
      }
    };

    const calculateTotalStats = () => {
      let count = 0;
      let totalFee = 0;
      Object.keys(bookings).forEach((d) => {
        const slots = bookings[d];
        const mySlot = slots.find((s) => s.studentName === user?.name);
        if (mySlot) {
          count++;
          totalFee += mySlot.fee;
        }
      });
      return { count, totalFee };
    };

    // Date checkers
    const isPythonWeek = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= new Date('2026-08-03') && d <= new Date('2026-08-07');
    };

    const dates = getCalendarDates();
    const stats = user ? calculateTotalStats() : { count: 0, totalFee: 0 };

    if (!user) {
      return (
        <div className="app-container">
          <div className="login-card">
            <h1>Course Registration</h1>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Student Name (中文姓名)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Birthday (生日 YYYYMMDD)</label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{8}"
                  placeholder="e.g. 20180815"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Parent Phone (家長電話)</label>
                <input
                  type="tel"
                  required
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Processing...' : 'Log In / Check'}
              </button>
            </form>
          </div>

          {showRegisterPrompt && (
            <div className="dialog-overlay">
              <div className="dialog-box">
                <h3>Student Not Registered</h3>
                <p>No record found for {formData.name} ({formData.birthday}). Would you like to register now?</p>
                <div className="dialog-actions">
                  <button className="dialog-btn confirm" onClick={handleRegister}>Yes, Register</button>
                  <button className="dialog-btn cancel" onClick={() => setShowRegisterPrompt(false)}>No</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="app-container">
        <div className="dashboard-header">
          <div>
            <h1>Dashboard: {user.name}</h1>
            <div className="profile-stats">
              <span className="stat-badge">Bookings: <strong>{stats.count} / 15</strong></span>
              <span className="stat-badge">Total Tuition: <strong>${stats.totalFee}</strong></span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>

        <div className="companion-controls">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isCompanionMode}
              onChange={(e) => {
                setIsCompanionMode(e.target.checked);
                if (!e.target.checked) {
                  setCompanionName('');
                  setCompanionStatus('idle');
                }
              }}
            />
            <strong>Enable 2-Person Group Booking (兩人同行)</strong>
          </label>

          {isCompanionMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Companion Name"
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'white' }}
                value={companionName}
                onChange={(e) => setCompanionName(e.target.value)}
              />
              <span style={{ fontSize: '0.875rem' }}>
                {companionStatus === 'validating' && '🟡 Checking...'}
                {companionStatus === 'valid' && '🟢 Verified (10% Off)'}
                {companionStatus === 'invalid' && `🔴 ${companionName} is not registered`}
              </span>
            </div>
          )}
        </div>

        <div className="calendar-section">
          <h2>Select Dates</h2>
          <div className="calendar-grid">
            <div className="grid-header">Monday</div>
            <div className="grid-header">Tuesday</div>
            <div className="grid-header">Wednesday</div>
            <div className="grid-header">Thursday</div>
            <div className="grid-header">Friday</div>

            {dates.map((d) => {
              const dateObj = new Date(d);
              const displayDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
              const slots = bookings[d] || [];
              const slotsFilled = slots.reduce((acc, curr) => acc + (curr.bookingType === 'companion' ? 2 : 1), 0);
              const slotsLeft = 2 - slotsFilled;
              const hasBooked = slots.some((s) => s.studentName === user.name);
              const pythonReserved = isPythonWeek(d);

              let cellClass = 'date-cell';
              if (pythonReserved) cellClass += ' python-reserved';
              else if (hasBooked) cellClass += ' my-booking';
              else if (slotsLeft === 0) cellClass += ' fully-booked';

              return (
                <div key={d} className={cellClass} data-tooltip="Python">
                  <div>
                    <div className="date-number">{displayDate}</div>
                    {pythonReserved ? (
                      <div className="slot-indicator" style={{ color: 'var(--accent-amber)' }}>Reserved (Python)</div>
                    ) : (
                      <div className="slot-indicator">
                        {slotsLeft === 0 ? 'Fully Booked' : `${slotsLeft} slot(s) left`}
                      </div>
                    )}
                  </div>

                  {!pythonReserved && (
                    <div>
                      {hasBooked ? (
                        <button className="cancel-btn" onClick={() => handleCancel(d)}>Cancel</button>
                      ) : (
                        <button
                          className="cell-btn"
                          disabled={slotsLeft === 0 || (isCompanionMode && slotsLeft < 2) || (isCompanionMode && companionStatus !== 'valid')}
                          onClick={() => handleBook(d)}
                        >
                          Book Now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {showConfirmModal && (
          <div className="dialog-overlay">
            <div className="dialog-box">
              <h3>Confirm Booking</h3>
              <p>Are you sure you want to book {showConfirmModal.date}?</p>
              <p>Price: {isCompanionMode ? '$1,800 (10% Discounted)' : '$2,000'}</p>
              <div className="dialog-actions">
                <button className="dialog-btn confirm" onClick={executeBooking}>Confirm</button>
                <button className="dialog-btn cancel" onClick={() => setShowConfirmModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showTeacherContactAlert && (
          <div className="dialog-overlay">
            <div className="dialog-box">
              <h3>Booking Saved</h3>
              <p>等待老師電話聯繫確認 (Waiting for teacher's call to confirm).</p>
              <button className="dialog-btn confirm" onClick={() => setShowTeacherContactAlert(false)}>OK</button>
            </div>
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 3: Create auxiliary GET slots route for loading calendar data**
  Write to `booking-app/app/api/booking/slots/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getDB } from '@/lib/db';

  export async function GET(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const date = searchParams.get('date');
      if (!date) {
        return NextResponse.json({ slots: [] });
      }
      const db = getDB();
      const slots = await db.get(`booking:${date}`) || [];
      return NextResponse.json({ slots });
    } catch {
      return NextResponse.json({ slots: [] });
    }
  }
  ```

- [ ] **Step 4: Run dev server compile**
  Run in `booking-app/`: `npm run build`
  Expected: Successful compilation of frontend page.tsx bundle and api endpoints.

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add booking-app/app/page.tsx booking-app/app/globals.css booking-app/app/api/booking/slots/route.ts
  git commit -m "feat: implement single page client calendar interface with custom vanilla CSS theme"
  ```

---

## Plan Self-Review Check
1. **Spec Coverage**: All items mapped. User login/registration, calendar rendering, weekday logic, 2-person group booking discount checks, LINE notifications via ChatEverywhere, Python reserved week, 15-booking limits, and database operations.
2. **Placeholder Scan**: Checked. Complete implementation scripts are provided with zero placeholders.
3. **Type Consistency**: Database key definitions and schema objects map identically across database adapter, API routes, and page view structures.
