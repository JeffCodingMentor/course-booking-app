# Design Specification: Teacher Admin Dashboard (管理員後台系統)

## 1. Project Overview
This module extends the Course Booking Application by introducing an isolated **Teacher Admin Dashboard** (管理員後台). This back-office webpage enables the teacher (Jeff 老師) to log in securely, manage student records, manually register students and place class bookings, override daily booking capacities, lock/unlock dates, and review detailed financial records (ledger/tuition calculator) per student.

---

## 2. Security & Session Management

### 2.1 Admin Authentication
* **Static Credential**: The single administrator password is set via the environment variable `ADMIN_PASSWORD`.
* **Login Route**: `/admin` (GET) renders a password entry field.
* **Authentication API**: `POST /api/admin/login`
  * Request Body: `{ password: "..." }`
  * Logic: Verifies the entered password against `process.env.ADMIN_PASSWORD`.
  * Response: If correct, returns a session flag and writes a secure cookie `admin_token` (or returns a validation token stored in `localStorage` as `admin_session`).
* **Route Guarding**:
  * The admin dashboard page `/admin/dashboard` verifies the session state on load. If invalid, redirects the browser back to `/admin`.
  * All admin API routes (`/api/admin/*`) verify that the `admin_session` cookie/token matches before processing database queries or mutations, returning `401 Unauthorized` or `403 Forbidden` if missing or mismatching.

---

## 3. Database Schema Extensions (Vercel KV / Redis)

We leverage Vercel KV for storing capacity overrides:

* **Key**: `capacity:{date}` (Redis String)
  * *Purpose*: Overrides the default capacity of 2 slots for a given date.
  * *Value*: An integer (e.g. `3` to allow 3 students, or `0` to lock the date).
  * *Default Behavior*: If this key does not exist for a date, the application defaults to a capacity of `2`.

---

## 4. Core Features & Business Logic

### 4.1 Student Roster & Tuition Ledger
* **Roster Query API**: `GET /api/admin/students`
  * Returns a list of all registered students (Name, Birthday, Phone) along with their class counts and tuition records.
* **Tuition Calculation**:
  * For each student, the backend aggregates their booking slots across all calendar dates.
  * The price of a class is calculated as:
    * **Single Booking (單人預約)**: `$3,000` per class.
    * **Group Booking (兩人同行)**: `$2,700` per class.
  * The API aggregates this data into:
    * List of dates booked.
    * Class type per date (單人/兩人同行) and actual fee.
    * Total number of days booked.
    * **Total Accumulated Tuition Fee (總計學費)**.

### 4.2 Manual Student Registration
* **Registration API**: `POST /api/admin/students/create`
  * Body: `{ name, birthday, parentPhone }`
  * Writes to `student:{name}:{birthday}` and adds the name to the `registered_students` set.

### 4.3 Manual Booking (手動新增預約)
* **Booking API**: `POST /api/admin/bookings/create`
  * Body: `{ studentName, dates: string[], isCompanionMode, companionName }`
  * Logic:
    * Bypasses the student-side authentication header checks.
    * Performs the same guard validations: checks daily capacity (querying custom `capacity:{date}` instead of defaulting to 2), checks student's total booking limits (<15), checks overlaps, writes slots, and dispatches a single aggregated LINE Notify booking alert.

### 4.4 Admin Booking Cancellation
* **Cancellation API**: `POST /api/admin/bookings/cancel`
  * Body: `{ studentName, date }`
  * Logic: Cancels the slot for that date (and companion slots if companion mode was used), updates sets, and dispatches a cancellation LINE Notify alert.

### 4.5 Capacity Control (容量控制)
* **Capacity Edit API**: `POST /api/admin/capacity`
  * Body: `{ date, capacity: number }`
  * Logic: Writes the custom capacity to `capacity:{date}`. If capacity is set to `0`, it locks the date.

---

## 5. UI/UX Layout Specification (Admin Dashboard)

### 5.1 Admin Page Layout
* Styled using the existing premium warm-color CSS theme.
* Stored in `/admin/dashboard/page.tsx` with a two-tab navigation system:
  1. **預約日曆管理 (Calendar Management)**:
     * Shows the 6-week weekday calendar with capacity bars and list of booked students per day.
     * Offers options to:
       * Increase capacity or lock dates.
       * Click a "手動新增預約" button.
       * Click a "取消預約" button next to any student's name on a cell, triggering a custom cancellation popup confirm dialog.
  2. **學生名冊與對帳單 (Student Ledger)**:
     * Lists all registered students.
     * Features a "手動新增學生" form.
     * Clicking a student's row expands a drawer or modal displaying:
       * Booked dates list.
       * Tuition fee per date (單人 $3,000 / 兩人同行 $2,700).
       * Summary line: "總計上課天數: X 天 | 總計學費: $Y 元".

### 5.2 RWD (Mobile Support)
* Stacks tabs and forms vertically on mobile viewports.
* Scrollable roster and ledger lists to ensure they display correctly on small screens.
