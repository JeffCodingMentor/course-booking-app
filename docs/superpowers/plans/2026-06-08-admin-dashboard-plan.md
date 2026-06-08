# Teacher Admin Dashboard Implementation Plan

This plan breaks down the development of the Teacher Admin Dashboard into structured, checkable tasks.

---

## File Structure Map
* `booking-app/app/admin/page.tsx` — Login Page.
* `booking-app/app/admin/dashboard/page.tsx` — Main Admin Panel (Tabbed: Calendar & Ledger).
* `booking-app/app/api/admin/login/route.ts` — Admin authentication endpoint.
* `booking-app/app/api/admin/students/route.ts` — Roster list & tuition ledger calculator endpoint.
* `booking-app/app/api/admin/students/create/route.ts` — Manual student registration endpoint.
* `booking-app/app/api/admin/bookings/create/route.ts` — Manual date booking endpoint.
* `booking-app/app/api/admin/bookings/cancel/route.ts` — Manual date cancellation endpoint.
* `booking-app/app/api/admin/capacity/route.ts` — Custom slots capacity override endpoint.
* `booking-app/tests/admin.test.ts` — Jest Integration tests for admin routes.

---

## Tasks

### Task 1: Admin Authentication & Layout Scaffolding
- [ ] **Step 1: Create Admin Login & Dashboard scaffolds**
  Create directory `booking-app/app/admin` and `booking-app/app/admin/dashboard`.
  Write static client views with auth state guards (checks `admin_session` in `localStorage` or session cookie, redirects `/admin/dashboard` to `/admin` if unauthorized).
- [ ] **Step 2: Implement Admin Login API**
  Write to `booking-app/app/api/admin/login/route.ts` comparing body password against `process.env.ADMIN_PASSWORD`.
- [ ] **Step 3: Setup local env variable**
  Add `ADMIN_PASSWORD="test_admin_pass"` to `booking-app/.env.local`.
- [ ] **Step 4: Commit**

---

### Task 2: Roster & Tuition Ledger APIs
- [ ] **Step 1: Write integration tests for Ledger endpoints**
  Create `booking-app/tests/admin.test.ts` and write assertions verifying that `GET /api/admin/students` returns registered students, calculated price lists ($3,000 for single, $2,700 for group booking), and correct aggregated totals.
- [ ] **Step 2: Run test to verify failure**
  Expected: FAIL
- [ ] **Step 3: Implement Roster & Ledger API endpoint**
  Write to `booking-app/app/api/admin/students/route.ts`. Read all keys in Vercel KV starting with `student:*`, load booking dates for each student, look up the pricing details from daily slots, calculate fees, and compute total sums.
- [ ] **Step 4: Run tests to verify they pass**
  Expected: PASS
- [ ] **Step 5: Commit**

---

### Task 3: Admin Manual Booking & Cancellation APIs
- [ ] **Step 1: Write integration tests for Booking Management APIs**
  Write tests in `booking-app/tests/admin.test.ts` verifying manual registration, manual booking creation (triggers LINE Notify alert), and manual cancellation (triggers LINE Notify cancellation alert).
- [ ] **Step 2: Run test to verify failure**
  Expected: FAIL
- [ ] **Step 3: Implement Manual Student Registration API**
  Write to `booking-app/app/api/admin/students/create/route.ts`.
- [ ] **Step 4: Implement Manual Booking API**
  Write to `booking-app/app/api/admin/bookings/create/route.ts` (manages sets, records single/companion bookings, and sends LINE notify).
- [ ] **Step 5: Implement Manual Cancellation API**
  Write to `booking-app/app/api/admin/bookings/cancel/route.ts` (cleans up slots, updates sets, and sends LINE notify).
- [ ] **Step 6: Run tests to verify they pass**
  Expected: PASS
- [ ] **Step 7: Commit**

---

### Task 4: Custom Capacity & Date Locking
- [ ] **Step 1: Write integration tests for Custom Capacity overrides**
  Write tests in `booking-app/tests/admin.test.ts` verifying that modifying capacity for a date updates Vercel KV key `capacity:{date}`, and that student booking validates against this custom capacity limit.
- [ ] **Step 2: Run test to verify failure**
  Expected: FAIL
- [ ] **Step 3: Implement Edit Capacity API**
  Write to `booking-app/app/api/admin/capacity/route.ts`.
- [ ] **Step 4: Integrate capacity check in student booking API & UI**
  Modify `/api/booking/create/route.ts` and the main `/` page to respect capacity overrides (checking KV `capacity:{date}` and defaulting to 2).
- [ ] **Step 5: Run tests to verify they pass**
  Expected: PASS
- [ ] **Step 6: Commit**

---

### Task 5: Admin Panel UI Development (Ledger Tab & Calendar Tab)
- [ ] **Step 1: Build Login page UI**
  Style the admin login interface in `/admin/page.tsx` using the warm-color theme.
- [ ] **Step 2: Build Main Admin Dashboard Panel UI**
  Develop `/admin/dashboard/page.tsx` with dual tabs:
  * **Calendar Management**: Displays 6-week calendar showing slots taken, custom capacity inputs, and delete buttons.
  * **Student Ledger**: Lists all students. Displays a "Register Student" form. Clicking a student expansions their ledger showing booked dates, individual fees ($3,000 / $2,700), and aggregate totals.
- [ ] **Step 3: Verify dev compile**
  Run `npm run build` to ensure Next.js packages the admin views cleanly.
- [ ] **Step 4: Commit**

---

### Task 6: RWD Optimizations & Verification
- [ ] **Step 1: Implement mobile styles**
  Write media queries in `globals.css` to stack the admin tab contents and table views cleanly on mobile screens (<= 768px and <= 600px).
- [ ] **Step 2: Run full test suite & linter**
  Run `npm run test` and `npm run lint` in `booking-app/`.
- [ ] **Step 3: Deploy compilation validation**
  Run `npm run build`.
- [ ] **Step 4: Merge to parent main and Push to GitHub**
  Commit nested files and push to `JeffCodingMentor/course-booking-app.git`.
